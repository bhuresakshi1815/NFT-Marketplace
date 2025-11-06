async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const NFT = await ethers.getContractFactory("NFTMarketplace");
  const nft = await NFT.deploy();

  // support both ethers v5 and v6 deployment APIs
  if (typeof nft.deployed === "function") {
    await nft.deployed();
  } else if (typeof nft.waitForDeployment === "function") {
    await nft.waitForDeployment();
  }

  // get address in a way that works on both versions
  const address = nft.address ?? (typeof nft.getAddress === "function" ? await nft.getAddress() : "(unknown)");

  console.log("NFTMarketplace deployed to:", address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
