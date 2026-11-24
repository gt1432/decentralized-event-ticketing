// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EventTicketing
 * @notice Decentralized Event Ticketing System with anti-scalping and NFT-based verification.
 * @dev ERC-721 NFT tickets with on-chain resale price caps and role-based access control.
 *
 * Architecture:
 *   - Each event is stored as a struct in this single contract.
 *   - Each ticket is an ERC-721 token with metadata stored on-chain.
 *   - Resale price cap is enforced inside the contract, not in front-end code.
 *   - Transfer restrictions: direct safeTransferFrom/transferFrom are blocked for tickets
 *     that are either redeemed or listed in the resale marketplace. Regular (non-listed,
 *     non-redeemed) tickets can still be freely transferred via standard ERC-721 transfers
 *     so that wallets and MetaMask work normally. Resale purchases go through buyResaleTicket().
 */
contract EventTicketing is ERC721, ERC721URIStorage, AccessControl, ReentrancyGuard, Pausable {

    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    bytes32 public constant VERIFIER_ROLE  = keccak256("VERIFIER_ROLE");

    // ─── State ────────────────────────────────────────────────────────────────
    uint256 private _nextEventId;
    uint256 private _nextTokenId;

    struct Event {
        uint256 eventId;
        address organizer;
        string  title;
        string  description;
        string  location;
        uint256 date;           // Unix timestamp
        string  imageURI;
        string  category;
        uint256 ticketPrice;    // in wei
        uint256 totalSupply;
        uint256 ticketsSold;
        uint256 maxResaleBps;   // max resale markup in basis points (e.g. 2000 = +20%)
        bool    active;
    }

    struct Ticket {
        uint256 tokenId;
        uint256 eventId;
        uint256 originalPrice;  // in wei
        uint256 purchaseTime;
        address originalBuyer;
        bool    redeemed;
        uint256 redemptionTime;
    }

    struct ResaleListing {
        uint256 tokenId;
        address seller;
        uint256 price;          // in wei
        bool    active;
    }

    mapping(uint256 => Event)          public events;
    mapping(uint256 => Ticket)         public tickets;
    mapping(uint256 => ResaleListing)  public resaleListings;

    // tokenId → whether it is in an active resale listing
    mapping(uint256 => bool) public isListed;

    // eventId → purchaser → number of tickets bought (for per-event per-wallet limits)
    mapping(uint256 => mapping(address => uint256)) public ticketsBoughtByAddress;

    uint256 public maxTicketsPerWallet = 5;

    // ─── Events ───────────────────────────────────────────────────────────────
    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        string  title,
        uint256 ticketPrice,
        uint256 totalSupply,
        uint256 date
    );
    event EventUpdated(uint256 indexed eventId);
    event EventDeactivated(uint256 indexed eventId);

    event TicketPurchased(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed buyer,
        uint256 price
    );
    event TicketMinted(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed to
    );
    event TicketListedForResale(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed seller,
        uint256 price
    );
    event ResaleListingCancelled(uint256 indexed tokenId, address indexed seller);
    event TicketResold(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed buyer,
        address seller,
        uint256 price
    );
    event TicketRedeemed(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed verifier,
        address owner
    );

    event VerifierRoleGranted(address indexed verifier, address indexed grantedBy);
    event VerifierRoleRevoked(address indexed verifier, address indexed revokedBy);
    event OrganizerRoleGranted(address indexed organizer, address indexed grantedBy);

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor() ERC721("EventTicket", "ETKT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORGANIZER_ROLE, msg.sender);
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier eventExists(uint256 eventId) {
        require(eventId < _nextEventId, "Event does not exist");
        _;
    }

    modifier onlyEventOrganizer(uint256 eventId) {
        require(events[eventId].organizer == msg.sender, "Not the event organizer");
        _;
    }

    // ─── Admin functions ──────────────────────────────────────────────────────

    /// @notice Grant organizer role to an address. Only DEFAULT_ADMIN can call this.
    function grantOrganizerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ORGANIZER_ROLE, account);
        emit OrganizerRoleGranted(account, msg.sender);
    }

    /// @notice Grant verifier role for a specific event's staff.
    function setVerifierRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, account);
        emit VerifierRoleGranted(account, msg.sender);
    }

    /// @notice Revoke verifier role.
    function revokeVerifierRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, account);
        emit VerifierRoleRevoked(account, msg.sender);
    }

    /// @notice Event organizers can also grant verifier role for their events.
    function setVerifierRoleByOrganizer(address account, uint256 eventId)
        external
        eventExists(eventId)
        onlyEventOrganizer(eventId)
    {
        _grantRole(VERIFIER_ROLE, account);
        emit VerifierRoleGranted(account, msg.sender);
    }

    function setMaxTicketsPerWallet(uint256 max) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(max > 0 && max <= 20, "Invalid max");
        maxTicketsPerWallet = max;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ─── Event Management ─────────────────────────────────────────────────────

    /**
     * @notice Create a new event.
     * @param title          Human-readable event title.
     * @param description    Event description.
     * @param location       Venue/location string.
     * @param date           Unix timestamp of the event.
     * @param imageURI       IPFS or HTTPS URI for the event poster.
     * @param category       Event category string.
     * @param ticketPrice    Ticket price in wei.
     * @param totalSupply    Maximum number of tickets.
     * @param maxResaleBps   Max resale price increase in basis points (0 = no resale allowed,
     *                       10000 = up to 2× original price, etc.).
     */
    function createEvent(
        string memory title,
        string memory description,
        string memory location,
        uint256 date,
        string memory imageURI,
        string memory category,
        uint256 ticketPrice,
        uint256 totalSupply,
        uint256 maxResaleBps
    ) external onlyRole(ORGANIZER_ROLE) whenNotPaused returns (uint256 eventId) {
        require(bytes(title).length > 0,       "Title required");
        require(date > block.timestamp,         "Event must be in the future");
        require(ticketPrice > 0,               "Price must be > 0");
        require(totalSupply > 0,               "Supply must be > 0");
        require(maxResaleBps <= 10000,         "maxResaleBps cannot exceed 10000 (100%)");

        eventId = _nextEventId++;

        events[eventId] = Event({
            eventId:      eventId,
            organizer:    msg.sender,
            title:        title,
            description:  description,
            location:     location,
            date:         date,
            imageURI:     imageURI,
            category:     category,
            ticketPrice:  ticketPrice,
            totalSupply:  totalSupply,
            ticketsSold:  0,
            maxResaleBps: maxResaleBps,
            active:       true
        });

        emit EventCreated(eventId, msg.sender, title, ticketPrice, totalSupply, date);
    }

    /// @notice Deactivate an event (stop further ticket sales). Cannot undo.
    function deactivateEvent(uint256 eventId)
        external
        eventExists(eventId)
        onlyEventOrganizer(eventId)
    {
        events[eventId].active = false;
        emit EventDeactivated(eventId);
    }

    // ─── Ticket Purchase & Minting ────────────────────────────────────────────

    /**
     * @notice Purchase a ticket for an event. Mints an ERC-721 token atomically.
     * @param eventId  The event to purchase a ticket for.
     * @return tokenId The minted NFT token ID.
     */
    function buyTicket(uint256 eventId)
        external
        payable
        eventExists(eventId)
        nonReentrant
        whenNotPaused
        returns (uint256 tokenId)
    {
        Event storage evt = events[eventId];
        require(evt.active,                                      "Event is not active");
        require(block.timestamp < evt.date,                      "Event has already occurred");
        require(evt.ticketsSold < evt.totalSupply,               "Event is sold out");
        require(msg.value == evt.ticketPrice,                    "Incorrect payment amount");
        require(
            ticketsBoughtByAddress[eventId][msg.sender] < maxTicketsPerWallet,
            "Per-wallet ticket limit reached"
        );

        tokenId = _nextTokenId++;

        evt.ticketsSold++;
        ticketsBoughtByAddress[eventId][msg.sender]++;

        tickets[tokenId] = Ticket({
            tokenId:       tokenId,
            eventId:       eventId,
            originalPrice: evt.ticketPrice,
            purchaseTime:  block.timestamp,
            originalBuyer: msg.sender,
            redeemed:      false,
            redemptionTime: 0
        });

        _safeMint(msg.sender, tokenId);

        emit TicketMinted(tokenId, eventId, msg.sender);
        emit TicketPurchased(tokenId, eventId, msg.sender, evt.ticketPrice);

        // Transfer payment to organizer
        (bool sent, ) = evt.organizer.call{value: msg.value}("");
        require(sent, "Payment transfer failed");
    }

    // ─── Resale Marketplace ───────────────────────────────────────────────────

    /**
     * @notice List a ticket for resale at a price no higher than the on-chain cap.
     * @param tokenId   The NFT token to list.
     * @param listPrice Requested resale price in wei.
     */
    function listTicketForResale(uint256 tokenId, uint256 listPrice)
        external
        nonReentrant
        whenNotPaused
    {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        Ticket storage tkt = tickets[tokenId];
        require(!tkt.redeemed, "Ticket already redeemed");
        require(!isListed[tokenId], "Already listed");

        Event storage evt = events[tkt.eventId];
        require(evt.maxResaleBps > 0, "Resale not allowed for this event");
        require(block.timestamp < evt.date, "Event has already occurred");

        uint256 maxResalePrice = tkt.originalPrice + (tkt.originalPrice * evt.maxResaleBps / 10000);
        require(listPrice <= maxResalePrice, "List price exceeds resale cap");
        require(listPrice > 0, "Price must be > 0");

        isListed[tokenId] = true;
        resaleListings[tokenId] = ResaleListing({
            tokenId: tokenId,
            seller:  msg.sender,
            price:   listPrice,
            active:  true
        });

        emit TicketListedForResale(tokenId, tkt.eventId, msg.sender, listPrice);
    }

    /// @notice Cancel a resale listing.
    function cancelResaleListing(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(isListed[tokenId], "Not listed");

        isListed[tokenId] = false;
        resaleListings[tokenId].active = false;

        emit ResaleListingCancelled(tokenId, msg.sender);
    }

    /**
     * @notice Purchase a resale ticket. Payment is split: seller gets their ask,
     *         excess (if any rounding) stays with contract (donated to organizer).
     * @param tokenId The token to purchase.
     */
    function buyResaleTicket(uint256 tokenId)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        require(isListed[tokenId], "Not listed for resale");
        ResaleListing storage listing = resaleListings[tokenId];
        require(listing.active, "Listing not active");
        require(msg.value == listing.price, "Incorrect payment");
        require(msg.sender != listing.seller, "Cannot buy your own listing");

        Ticket storage tkt = tickets[tokenId];
        require(!tkt.redeemed, "Ticket already redeemed");

        address seller = listing.seller;
        uint256 price  = listing.price;
        uint256 eventId = tkt.eventId;

        // Re-verify price cap (defence in depth — seller could not have changed it
        // after listing, but we verify anyway).
        Event storage evt = events[eventId];
        uint256 maxResalePrice = tkt.originalPrice + (tkt.originalPrice * evt.maxResaleBps / 10000);
        require(price <= maxResalePrice, "Resale price exceeds cap");

        isListed[tokenId] = false;
        listing.active    = false;

        // Transfer NFT ownership
        _transfer(seller, msg.sender, tokenId);

        // Pay seller
        (bool sent, ) = seller.call{value: price}("");
        require(sent, "Payment to seller failed");

        emit TicketResold(tokenId, eventId, msg.sender, seller, price);
    }

    // ─── Ticket Redemption / Verification ────────────────────────────────────

    /**
     * @notice Redeem (check-in) a ticket at the event. Marks it as used on-chain.
     * @dev    Only VERIFIER_ROLE or ORGANIZER_ROLE may call this.
     * @param tokenId  The ticket NFT to redeem.
     * @param eventId  The event context — prevents wrong-event redemption.
     */
    function redeemTicket(uint256 tokenId, uint256 eventId)
        external
        eventExists(eventId)
    {
        require(
            hasRole(VERIFIER_ROLE, msg.sender) || hasRole(ORGANIZER_ROLE, msg.sender),
            "Not authorized to redeem tickets"
        );

        Ticket storage tkt = tickets[tokenId];
        require(tkt.eventId == eventId,  "Ticket is for a different event");
        require(!tkt.redeemed,           "Ticket already redeemed");

        address owner = ownerOf(tokenId);

        tkt.redeemed       = true;
        tkt.redemptionTime = block.timestamp;

        // Cancel any active resale listing
        if (isListed[tokenId]) {
            isListed[tokenId] = false;
            resaleListings[tokenId].active = false;
        }

        emit TicketRedeemed(tokenId, eventId, msg.sender, owner);
    }

    // ─── View / Query Functions ───────────────────────────────────────────────

    function getEventDetails(uint256 eventId)
        external
        view
        eventExists(eventId)
        returns (Event memory)
    {
        return events[eventId];
    }

    function getTicketDetails(uint256 tokenId)
        external
        view
        returns (Ticket memory)
    {
        require(tokenId < _nextTokenId, "Ticket does not exist");
        return tickets[tokenId];
    }

    function getTicketOwner(uint256 tokenId) external view returns (address) {
        return ownerOf(tokenId);
    }

    function getTotalEvents() external view returns (uint256) {
        return _nextEventId;
    }

    function getTotalTickets() external view returns (uint256) {
        return _nextTokenId;
    }

    function getResaleListing(uint256 tokenId)
        external
        view
        returns (ResaleListing memory)
    {
        return resaleListings[tokenId];
    }

    function isTicketValid(uint256 tokenId, uint256 eventId)
        external
        view
        returns (bool valid, string memory reason)
    {
        if (tokenId >= _nextTokenId) return (false, "Token does not exist");
        Ticket storage tkt = tickets[tokenId];
        if (tkt.eventId != eventId)  return (false, "Wrong event");
        if (tkt.redeemed)            return (false, "Already redeemed");
        return (true, "Valid");
    }

    function getTicketsByOwner(address owner, uint256 fromTokenId, uint256 toTokenId)
        external
        view
        returns (uint256[] memory tokenIds)
    {
        require(toTokenId >= fromTokenId, "Invalid range");
        uint256 count;
        uint256 total = _nextTokenId;
        uint256 end = toTokenId < total ? toTokenId : total - 1;

        // First pass: count
        for (uint256 i = fromTokenId; i <= end; i++) {
            if (_ownerOf(i) == owner) count++;
        }

        tokenIds = new uint256[](count);
        uint256 idx;
        for (uint256 i = fromTokenId; i <= end; i++) {
            if (_ownerOf(i) == owner) tokenIds[idx++] = i;
        }
    }

    // ─── ERC-721 Transfer Restrictions ───────────────────────────────────────

    /**
     * @dev Override _update to enforce transfer restrictions:
     *   1. Redeemed tickets cannot be transferred.
     *   2. Listed tickets cannot be transferred directly (must go through buyResaleTicket).
     *   Minting (from == address(0)) and burning are not restricted.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // Allow minting
        if (from != address(0)) {
            Ticket storage tkt = tickets[tokenId];

            // Block transfers of redeemed tickets
            require(!tkt.redeemed, "Redeemed tickets cannot be transferred");

            // Block direct transfers of listed tickets (must use buyResaleTicket)
            if (isListed[tokenId]) {
                // The only allowed caller is this contract itself (buyResaleTicket)
                require(
                    auth == address(this),
                    "Listed tickets must be sold through buyResaleTicket"
                );
            }
        }

        return super._update(to, tokenId, auth);
    }

    // ─── Mandatory overrides ──────────────────────────────────────────────────

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
