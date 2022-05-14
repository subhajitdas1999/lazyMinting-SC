/* This is testing function provide contract address and set the chain id (according to network) and get a signed NFT from minter address*/
const { ethers } = require("hardhat");

const { BigNumber } = require("ethers");
const { TypedDataUtils } = require("ethers-eip712");

contractAddress = "0x58C54666c20059d61008978F56b015d6818b5680";

types = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
  NFTPackage: [
    { name: "tokenId", type: "uint256" },
    { name: "price", type: "uint256" },
    { name: "tokenURI", type: "string" },
  ],
};

async function getDomain() {
  // const chainId = await this.signer.getChainId();
  const domain = {
    name: "LazyMint",
    version: "1",
    chainId: 4, //for testing in rinkeby
    verifyingContract: contractAddress,
  };

  return domain;
}

async function getSignature(NFTPackage) {
  const [signer] = await ethers.getSigners();
  console.log("signer Address : ", signer.address);

  const domain = await getDomain();
  const typedData = {
    types,
    primaryType: "NFTPackage",
    domain: domain,
    message: NFTPackage,
  };

  const digest = TypedDataUtils.encodeDigest(typedData);
  const digestHex = ethers.utils.hexlify(digest);
  // console.log(this.signer.address);
  // console.log("My side",digestHex);
  const signature = await signer.signMessage(digest);
  // console.log(signature);
  return signature;
}

const price = 20;
const tokenURI = "sample-token-uri";
const tokenId = BigNumber.from(
  ethers.utils.keccak256(
    // converting from hex to uint with BigNumber
    price,
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes(tokenURI))
  )
);
const NFTPackage = {
  tokenId: tokenId,
  price: 20,
  tokenURI: "sample-token-uri",
};
console.log("Token ID :", tokenId);

getSignature(NFTPackage).then((val) => {
  console.log(val);
});
