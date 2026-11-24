const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EventTicketing", function () {
  let contract;
  let owner, organizer, buyer1, buyer2, verifier, stranger;
  let futureDate;

  const ORGANIZER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZER_ROLE"));
  const VERIFIER_ROLE  = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"));

  const ticketPrice = ethers.parseEther("0.1");
  const totalSupply = 10;
  const maxResaleBps = 2000; // 20% above original price

  beforeEach(async function () {
    [owner, organizer, buyer1, buyer2, verifier, stranger] = await ethers.getSigners();

    const EventTicketing = await ethers.getContractFactory("EventTicketing");
    contract = await EventTicketing.deploy();

    await contract.connect(owner).grantOrganizerRole(organizer.address);
    await contract.connect(owner).setVerifierRole(verifier.address);

    futureDate = (await time.latest()) + 7 * 24 * 3600;
  });

  // ─── Helper ────────────────────────────────────────────────────────────────
  async function createTestEvent(overrides = {}) {
    const tx = await contract.connect(organizer).createEvent(
      overrides.title        ?? "Rock Concert 2025",
      overrides.description  ?? "An amazing rock concert",
      overrides.location     ?? "Madison Square Garden",
      overrides.date         ?? futureDate,
      overrides.imageURI     ?? "ipfs://QmTest",
      overrides.category     ?? "Music",
      overrides.ticketPrice  ?? ticketPrice,
      overrides.totalSupply  ?? totalSupply,
      overrides.maxResaleBps ?? maxResaleBps
    );
    const receipt = await tx.wait();
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === "EventCreated") return parsed.args[0];
      } catch {}
    }
    return 0n;
  }

  async function buyTicket(signer, eventId, value) {
    const tx = await contract.connect(signer).buyTicket(eventId, {
      value: value ?? ticketPrice,
    });
    const receipt = await tx.wait();
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === "TicketMinted") return parsed.args[0];
      } catch {}
    }
    return 0n;
  }

  // ─── 1. Deployment & Roles ─────────────────────────────────────────────────
  describe("Deployment & Access Control", function () {
    it("deploys with correct name and symbol", async function () {
      expect(await contract.name()).to.equal("EventTicket");
      expect(await contract.symbol()).to.equal("ETKT");
    });

    it("grants DEFAULT_ADMIN_ROLE to deployer", async function () {
      const ADMIN = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(ADMIN, owner.address)).to.be.true;
    });

    it("grants ORGANIZER_ROLE to deployer", async function () {
      expect(await contract.hasRole(ORGANIZER_ROLE, owner.address)).to.be.true;
    });

    it("allows admin to grant ORGANIZER_ROLE", async function () {
      expect(await contract.hasRole(ORGANIZER_ROLE, organizer.address)).to.be.true;
    });

    it("allows admin to grant VERIFIER_ROLE", async function () {
      expect(await contract.hasRole(VERIFIER_ROLE, verifier.address)).to.be.true;
    });

    it("reverts when stranger tries to create event", async function () {
      let threw = false;
      try {
        await contract.connect(stranger).createEvent(
          "X", "X", "X", futureDate, "", "Music", ticketPrice, 10, 1000
        );
      } catch (e) {
        threw = true;
      }
      expect(threw).to.be.true;
    });

    it("allows organizer to grant verifier role for their own event", async function () {
      const eventId = await createTestEvent();
      await contract.connect(organizer).setVerifierRoleByOrganizer(stranger.address, eventId);
      expect(await contract.hasRole(VERIFIER_ROLE, stranger.address)).to.be.true;
    });
  });

  // ─── 2. Event Creation ─────────────────────────────────────────────────────
  describe("Event Creation", function () {
    it("creates an event and emits EventCreated", async function () {
      const tx = await contract.connect(organizer).createEvent(
        "Test Event", "Desc", "NYC", futureDate,
        "ipfs://x", "Music", ticketPrice, 100, 1000
      );
      const receipt = await tx.wait();
      let found = false;
      for (const log of receipt.logs) {
        try {
          const p = contract.interface.parseLog(log);
          if (p?.name === "EventCreated") { found = true; break; }
        } catch {}
      }
      expect(found).to.be.true;
    });

    it("stores event data correctly", async function () {
      const eventId = await createTestEvent();
      const evt = await contract.getEventDetails(eventId);
      expect(evt.title).to.equal("Rock Concert 2025");
      expect(evt.ticketPrice).to.equal(ticketPrice);
      expect(Number(evt.totalSupply)).to.equal(totalSupply);
      expect(Number(evt.maxResaleBps)).to.equal(maxResaleBps);
      expect(evt.active).to.be.true;
    });

    it("increments total events", async function () {
      await createTestEvent();
      await createTestEvent();
      expect(Number(await contract.getTotalEvents())).to.equal(2);
    });

    it("reverts with empty title", async function () {
      let threw = false;
      try {
        await contract.connect(organizer).createEvent("", "Desc", "NYC", futureDate, "", "Music", ticketPrice, 10, 1000);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Title required");
      }
      expect(threw).to.be.true;
    });

    it("reverts with past date", async function () {
      const pastDate = (await time.latest()) - 100;
      let threw = false;
      try {
        await contract.connect(organizer).createEvent("T", "D", "L", pastDate, "", "Music", ticketPrice, 10, 1000);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("future");
      }
      expect(threw).to.be.true;
    });

    it("reverts with zero price", async function () {
      let threw = false;
      try {
        await contract.connect(organizer).createEvent("T", "D", "L", futureDate, "", "Music", 0, 10, 1000);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Price");
      }
      expect(threw).to.be.true;
    });

    it("reverts with zero supply", async function () {
      let threw = false;
      try {
        await contract.connect(organizer).createEvent("T", "D", "L", futureDate, "", "Music", ticketPrice, 0, 1000);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Supply");
      }
      expect(threw).to.be.true;
    });

    it("reverts with maxResaleBps > 10000", async function () {
      let threw = false;
      try {
        await contract.connect(organizer).createEvent("T", "D", "L", futureDate, "", "Music", ticketPrice, 10, 10001);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("maxResaleBps");
      }
      expect(threw).to.be.true;
    });
  });

  // ─── 3. Ticket Purchase ───────────────────────────────────────────────────
  describe("Ticket Purchase", function () {
    let eventId;

    beforeEach(async function () {
      eventId = await createTestEvent();
    });

    it("mints NFT and emits TicketMinted", async function () {
      const tx = await contract.connect(buyer1).buyTicket(eventId, { value: ticketPrice });
      const receipt = await tx.wait();
      let found = false;
      for (const log of receipt.logs) {
        try {
          const p = contract.interface.parseLog(log);
          if (p?.name === "TicketMinted") { found = true; break; }
        } catch {}
      }
      expect(found).to.be.true;
    });

    it("assigns NFT ownership to buyer", async function () {
      const tokenId = await buyTicket(buyer1, eventId);
      expect(await contract.ownerOf(tokenId)).to.equal(buyer1.address);
    });

    it("stores ticket metadata correctly", async function () {
      const tokenId = await buyTicket(buyer1, eventId);
      const tkt = await contract.getTicketDetails(tokenId);
      expect(tkt.eventId).to.equal(eventId);
      expect(tkt.originalPrice).to.equal(ticketPrice);
      expect(tkt.originalBuyer).to.equal(buyer1.address);
      expect(tkt.redeemed).to.be.false;
    });

    it("increments ticketsSold", async function () {
      await buyTicket(buyer1, eventId);
      const evt = await contract.getEventDetails(eventId);
      expect(Number(evt.ticketsSold)).to.equal(1);
    });

    it("reverts with incorrect payment", async function () {
      let threw = false;
      try {
        await contract.connect(buyer1).buyTicket(eventId, { value: ethers.parseEther("0.05") });
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Incorrect payment");
      }
      expect(threw).to.be.true;
    });

    it("reverts on sold-out event", async function () {
      const smallEventId = await createTestEvent({ totalSupply: 2 });
      await buyTicket(buyer1, smallEventId);
      await buyTicket(buyer2, smallEventId);
      let threw = false;
      try {
        await contract.connect(stranger).buyTicket(smallEventId, { value: ticketPrice });
      } catch (e) {
        threw = true;
        expect(e.message).to.include("sold out");
      }
      expect(threw).to.be.true;
    });

    it("reverts for inactive event", async function () {
      await contract.connect(organizer).deactivateEvent(eventId);
      let threw = false;
      try {
        await contract.connect(buyer1).buyTicket(eventId, { value: ticketPrice });
      } catch (e) {
        threw = true;
        expect(e.message).to.include("not active");
      }
      expect(threw).to.be.true;
    });

    it("reverts after event date has passed", async function () {
      await time.increaseTo(futureDate + 1);
      let threw = false;
      try {
        await contract.connect(buyer1).buyTicket(eventId, { value: ticketPrice });
      } catch (e) {
        threw = true;
        expect(e.message).to.include("already occurred");
      }
      expect(threw).to.be.true;
    });

    it("enforces per-wallet limit", async function () {
      const max = Number(await contract.maxTicketsPerWallet());
      // Create event with enough supply
      const bigEventId = await createTestEvent({ totalSupply: 20 });
      for (let i = 0; i < max; i++) {
        await buyTicket(buyer1, bigEventId);
      }
      let threw = false;
      try {
        await contract.connect(buyer1).buyTicket(bigEventId, { value: ticketPrice });
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Per-wallet");
      }
      expect(threw).to.be.true;
    });

    it("transfers payment to organizer", async function () {
      const before = await ethers.provider.getBalance(organizer.address);
      await buyTicket(buyer1, eventId);
      const after = await ethers.provider.getBalance(organizer.address);
      expect(after - before).to.equal(ticketPrice);
    });
  });

  // ─── 4. Resale Marketplace ─────────────────────────────────────────────────
  describe("Resale Marketplace", function () {
    let eventId, tokenId;

    beforeEach(async function () {
      eventId = await createTestEvent();
      tokenId = await buyTicket(buyer1, eventId);
    });

    it("lists ticket for resale and emits TicketListedForResale", async function () {
      const resalePrice = ethers.parseEther("0.11");
      const tx = await contract.connect(buyer1).listTicketForResale(tokenId, resalePrice);
      const receipt = await tx.wait();
      let found = false;
      for (const log of receipt.logs) {
        try {
          const p = contract.interface.parseLog(log);
          if (p?.name === "TicketListedForResale") { found = true; break; }
        } catch {}
      }
      expect(found).to.be.true;
    });

    it("reverts listing above resale cap", async function () {
      const tooHigh = ethers.parseEther("0.121"); // > 0.12 ETH cap (20% of 0.1)
      let threw = false;
      try {
        await contract.connect(buyer1).listTicketForResale(tokenId, tooHigh);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("resale cap");
      }
      expect(threw).to.be.true;
    });

    it("allows listing at exact cap price", async function () {
      const cap = ticketPrice + (ticketPrice * BigInt(maxResaleBps)) / 10000n;
      const tx = await contract.connect(buyer1).listTicketForResale(tokenId, cap);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("prevents non-owner from listing", async function () {
      let threw = false;
      try {
        await contract.connect(buyer2).listTicketForResale(tokenId, ethers.parseEther("0.11"));
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Not ticket owner");
      }
      expect(threw).to.be.true;
    });

    it("prevents listing when event disables resale (maxResaleBps = 0)", async function () {
      const noResaleEventId = await createTestEvent({ maxResaleBps: 0 });
      const noResaleTokenId = await buyTicket(buyer1, noResaleEventId);
      let threw = false;
      try {
        await contract.connect(buyer1).listTicketForResale(noResaleTokenId, ethers.parseEther("0.11"));
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Resale not allowed");
      }
      expect(threw).to.be.true;
    });

    it("prevents listing a redeemed ticket", async function () {
      await contract.connect(verifier).redeemTicket(tokenId, eventId);
      let threw = false;
      try {
        await contract.connect(buyer1).listTicketForResale(tokenId, ethers.parseEther("0.11"));
      } catch (e) {
        threw = true;
        expect(e.message).to.include("redeemed");
      }
      expect(threw).to.be.true;
    });

    it("buys resale ticket and transfers ownership + payment", async function () {
      const resalePrice = ethers.parseEther("0.11");
      await contract.connect(buyer1).listTicketForResale(tokenId, resalePrice);

      const sellerBefore = await ethers.provider.getBalance(buyer1.address);
      await contract.connect(buyer2).buyResaleTicket(tokenId, { value: resalePrice });
      const sellerAfter = await ethers.provider.getBalance(buyer1.address);

      expect(await contract.ownerOf(tokenId)).to.equal(buyer2.address);
      expect(sellerAfter - sellerBefore).to.equal(resalePrice);
    });

    it("emits TicketResold on purchase", async function () {
      const resalePrice = ethers.parseEther("0.11");
      await contract.connect(buyer1).listTicketForResale(tokenId, resalePrice);
      const tx = await contract.connect(buyer2).buyResaleTicket(tokenId, { value: resalePrice });
      const receipt = await tx.wait();
      let found = false;
      for (const log of receipt.logs) {
        try {
          const p = contract.interface.parseLog(log);
          if (p?.name === "TicketResold") { found = true; break; }
        } catch {}
      }
      expect(found).to.be.true;
    });

    it("reverts if buyer sends wrong amount", async function () {
      const resalePrice = ethers.parseEther("0.11");
      await contract.connect(buyer1).listTicketForResale(tokenId, resalePrice);
      let threw = false;
      try {
        await contract.connect(buyer2).buyResaleTicket(tokenId, { value: ethers.parseEther("0.09") });
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Incorrect payment");
      }
      expect(threw).to.be.true;
    });

    it("prevents seller from buying their own listing", async function () {
      const resalePrice = ethers.parseEther("0.11");
      await contract.connect(buyer1).listTicketForResale(tokenId, resalePrice);
      let threw = false;
      try {
        await contract.connect(buyer1).buyResaleTicket(tokenId, { value: resalePrice });
      } catch (e) {
        threw = true;
        expect(e.message).to.include("own listing");
      }
      expect(threw).to.be.true;
    });

    it("blocks direct ERC-721 transfer of a listed ticket", async function () {
      await contract.connect(buyer1).listTicketForResale(tokenId, ethers.parseEther("0.11"));
      let threw = false;
      try {
        await contract.connect(buyer1).transferFrom(buyer1.address, buyer2.address, tokenId);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("buyResaleTicket");
      }
      expect(threw).to.be.true;
    });

    it("allows cancel listing and then direct transfer", async function () {
      await contract.connect(buyer1).listTicketForResale(tokenId, ethers.parseEther("0.11"));
      await contract.connect(buyer1).cancelResaleListing(tokenId);
      await contract.connect(buyer1).transferFrom(buyer1.address, buyer2.address, tokenId);
      expect(await contract.ownerOf(tokenId)).to.equal(buyer2.address);
    });
  });

  // ─── 5. Ticket Redemption ──────────────────────────────────────────────────
  describe("Ticket Redemption", function () {
    let eventId, tokenId;

    beforeEach(async function () {
      eventId = await createTestEvent();
      tokenId = await buyTicket(buyer1, eventId);
    });

    it("verifier can redeem a valid ticket", async function () {
      const tx = await contract.connect(verifier).redeemTicket(tokenId, eventId);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("organizer can redeem a valid ticket", async function () {
      const tx = await contract.connect(organizer).redeemTicket(tokenId, eventId);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("marks ticket as redeemed on-chain", async function () {
      await contract.connect(verifier).redeemTicket(tokenId, eventId);
      const tkt = await contract.getTicketDetails(tokenId);
      expect(tkt.redeemed).to.be.true;
    });

    it("reverts on double redemption", async function () {
      await contract.connect(verifier).redeemTicket(tokenId, eventId);
      let threw = false;
      try {
        await contract.connect(verifier).redeemTicket(tokenId, eventId);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("already redeemed");
      }
      expect(threw).to.be.true;
    });

    it("reverts for wrong event", async function () {
      const eventId2 = await createTestEvent({ title: "Second Event" });
      let threw = false;
      try {
        await contract.connect(verifier).redeemTicket(tokenId, eventId2);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("different event");
      }
      expect(threw).to.be.true;
    });

    it("reverts when stranger tries to redeem", async function () {
      let threw = false;
      try {
        await contract.connect(stranger).redeemTicket(tokenId, eventId);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Not authorized");
      }
      expect(threw).to.be.true;
    });

    it("blocks transfer of redeemed ticket", async function () {
      await contract.connect(verifier).redeemTicket(tokenId, eventId);
      let threw = false;
      try {
        await contract.connect(buyer1).transferFrom(buyer1.address, buyer2.address, tokenId);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Redeemed tickets");
      }
      expect(threw).to.be.true;
    });

    it("isTicketValid returns correct states", async function () {
      let [valid, reason] = await contract.isTicketValid(tokenId, eventId);
      expect(valid).to.be.true;
      expect(reason).to.equal("Valid");

      await contract.connect(verifier).redeemTicket(tokenId, eventId);
      [valid, reason] = await contract.isTicketValid(tokenId, eventId);
      expect(valid).to.be.false;
      expect(reason).to.equal("Already redeemed");
    });

    it("isTicketValid returns Wrong event for mismatched event", async function () {
      const eventId2 = await createTestEvent({ title: "Another" });
      const [valid, reason] = await contract.isTicketValid(tokenId, eventId2);
      expect(valid).to.be.false;
      expect(reason).to.equal("Wrong event");
    });

    it("cancels active resale listing when ticket is redeemed", async function () {
      await contract.connect(buyer1).listTicketForResale(tokenId, ethers.parseEther("0.11"));
      await contract.connect(verifier).redeemTicket(tokenId, eventId);
      const listing = await contract.getResaleListing(tokenId);
      expect(listing.active).to.be.false;
    });
  });

  // ─── 6. Unauthorized Minting ──────────────────────────────────────────────
  describe("Unauthorized Minting Prevention", function () {
    it("prevents strangers from calling buyTicket without paying", async function () {
      const eventId = await createTestEvent();
      let threw = false;
      try {
        await contract.connect(stranger).buyTicket(eventId, { value: 0 });
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Incorrect payment");
      }
      expect(threw).to.be.true;
    });

    it("prevents buying tickets for non-existent events", async function () {
      let threw = false;
      try {
        await contract.connect(buyer1).buyTicket(9999n, { value: ticketPrice });
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Event does not exist");
      }
      expect(threw).to.be.true;
    });
  });

  // ─── 7. Query Functions ───────────────────────────────────────────────────
  describe("Query Functions", function () {
    it("getTicketsByOwner returns owned tokens", async function () {
      const eventId = await createTestEvent();
      const t1 = await buyTicket(buyer1, eventId);
      const t2 = await buyTicket(buyer1, eventId);

      const owned = await contract.getTicketsByOwner(buyer1.address, 0n, 100n);
      const ownedStrs = owned.map(x => x.toString());
      expect(ownedStrs).to.include(t1.toString());
      expect(ownedStrs).to.include(t2.toString());
    });

    it("getTicketDetails reverts for non-existent token", async function () {
      let threw = false;
      try {
        await contract.getTicketDetails(9999n);
      } catch (e) {
        threw = true;
        expect(e.message).to.include("Ticket does not exist");
      }
      expect(threw).to.be.true;
    });
  });

  // ─── 8. Pause Functionality ───────────────────────────────────────────────
  describe("Pause", function () {
    it("admin can pause contract — createEvent reverts when paused", async function () {
      await contract.connect(owner).pause();
      let threw = false;
      try {
        await contract.connect(organizer).createEvent(
          "X", "X", "X", futureDate, "", "Music", ticketPrice, 1, 0
        );
      } catch (e) {
        threw = true;
      }
      expect(threw).to.be.true;
      await contract.connect(owner).unpause();
    });

    it("non-admin cannot pause", async function () {
      let threw = false;
      try {
        await contract.connect(stranger).pause();
      } catch (e) {
        threw = true;
      }
      expect(threw).to.be.true;
    });
  });
});
