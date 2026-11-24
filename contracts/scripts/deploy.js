const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying EventTicketing contract...");
  console.log("Network:", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log(
    "Deployer balance:",
    hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const EventTicketing = await hre.ethers.getContractFactory("EventTicketing");
  const contract = await EventTicketing.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("EventTicketing deployed to:", address);

  // Save deployment info for frontend to consume
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contractAddress: address,
    deployerAddress: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };

  // Write to contracts/deployments/
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const deployFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deployFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deployFile);

  // Also copy ABI + address into frontend/src/contracts for easy import
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "EventTicketing.sol",
    "EventTicketing.json"
  );

  const frontendContractsDir = path.join(
    __dirname,
    "..",
    "..",
    "frontend",
    "src",
    "contracts"
  );
  if (!fs.existsSync(frontendContractsDir))
    fs.mkdirSync(frontendContractsDir, { recursive: true });

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const frontendArtifact = {
      contractName: artifact.contractName,
      abi: artifact.abi,
      networks: {
        [deploymentInfo.chainId]: {
          address: address,
        },
      },
      deploymentInfo,
    };
    fs.writeFileSync(
      path.join(frontendContractsDir, "EventTicketing.json"),
      JSON.stringify(frontendArtifact, null, 2)
    );
    console.log("ABI + address copied to frontend/src/contracts/EventTicketing.json");
  }

  // Verify on Etherscan if not local
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("Waiting 5 blocks before verification...");
    await new Promise((r) => setTimeout(r, 30000));
    try {
      await hre.run("verify:verify", { address });
      console.log("Contract verified on Etherscan.");
    } catch (e) {
      console.log("Etherscan verification failed (non-fatal):", e.message);
    }
  }

  console.log("\n✅ Deployment complete.");
  console.log("Contract address:", address);
  return address;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
