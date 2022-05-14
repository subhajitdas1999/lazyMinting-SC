async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    console.log("Account balance:", (await deployer.getBalance()).toString());
  
    const MyLazyMinting = await ethers.getContractFactory("MyLazyMinting");
    const myLazyMinting = await MyLazyMinting.deploy();
  
    console.log("MyLazyMinting address:", myLazyMinting.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });