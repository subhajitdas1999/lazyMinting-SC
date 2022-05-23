const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, waffle } = require("hardhat");
const LazyMint = require("../utils/NFTSignature");
const provider = waffle.provider;

describe("MyLazyMinting contract", () => {
  let minter;
  let addr1;
  let addr2;
  let addrs;
  let MyLazyMinting;
  let myLazyMinting;

  const createNFTAndGetSig = async () => {
    const price = 20;
    const tokenURI = "sample-token-uri";
    const tokenId = BigNumber.from(
      ethers.utils.keccak256(
        price,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(tokenURI))
      )
    );
    const NFTPackage = {
      tokenId: tokenId,
      price: 20,
      tokenURI: "sample-token-uri",
    };

    const lazyMint = new LazyMint(myLazyMinting.address, minter);
    //sign the NFT from minter
    const signature = await lazyMint.getSignature(NFTPackage);

    return { NFTPackage, signature };
  };

  beforeEach(async () => {
    [minter, addr1, addr2, ...addrs] = await ethers.getSigners();

    MyLazyMinting = await ethers.getContractFactory("MyLazyMinting");
    myLazyMinting = await MyLazyMinting.deploy();
  });

  it("Should Able to claim a off chain NFT from a valid minter", async () => {
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
      price: "20",
      tokenURI: "sample-token-uri",
    };

    // Become a minter in the NFT contract
    await myLazyMinting.SetMinterRole(minter.address);

    const lazyMint = new LazyMint(myLazyMinting.address, minter);
    //sign the NFT from minter
    const signature = await lazyMint.getSignature(NFTPackage);
    //NFT creator balance before anyone claim the NFT onchain
    const creatorBalanceBefore = await provider.getBalance(minter.address);

    //claim the NFT(off-chain) from addr1 account
    await expect(
      myLazyMinting
        .connect(addr1)
        .claimNFT(NFTPackage, signature, { value: 20 })
    )
      .to.emit(myLazyMinting, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        minter.address,
        NFTPackage.tokenId
      )
      .and.to.emit(myLazyMinting, "Transfer") // transfer from minter to addr1
      .withArgs(minter.address, addr1.address, NFTPackage.tokenId)
      .and.to.emit(myLazyMinting, "ClaimNFTOnChain") // claim the NFT from off-chain to on-chain
      .withArgs(minter.address, addr1.address, NFTPackage.tokenId);

    // Buyer should be owner of the claimed NFT
    expect(await myLazyMinting.ownerOf(NFTPackage.tokenId)).be.equal(
      addr1.address
    );

    //NFT creator balance After anyone claim the NFT onchain
    const creatorBalanceAfter = await provider.getBalance(minter.address);

    //difference in creator's ether balance
    const diff = creatorBalanceAfter.sub(creatorBalanceBefore);

    //this diff should be same as NFT price
    expect(diff).be.equal(NFTPackage.price);
  });

  it("Should not able to claim a NFT, sign by a non minter in the contract", async () => {
    const { NFTPackage, signature } = await createNFTAndGetSig();

    //now try to claim the NFT without setting minter role

    await expect(
      myLazyMinting
        .connect(addr1)
        .claimNFT(NFTPackage, signature, { value: 20 })
    ).to.be.revertedWith("Signature provided is not from a minter");
  });

  it("should not able to claim an NFT,which is already minted", async () => {
    //step 1 : create a sig and become a minter

    // Become a minter in the NFT contract
    await myLazyMinting.SetMinterRole(minter.address);

    //sign the NFT and get the signature
    const { NFTPackage, signature } = await createNFTAndGetSig();

    //step 2 :claim the NFT from addr1

    //claim the NFT and bring it on-chain
    await myLazyMinting
      .connect(addr1)
      .claimNFT(NFTPackage, signature, { value: 20 });

    //step 3 :
    // again try to claim that NFT from different
    await expect(
      myLazyMinting
        .connect(addr1)
        .claimNFT(NFTPackage, signature, { value: 20 })
    ).to.be.revertedWith("ERC721: token already minted");
  });

  it("Should able to buy an Onchain NFT", async () => {
    // Become a minter in the NFT contract
    await myLazyMinting.SetMinterRole(minter.address);

    //sign the NFT and get the signature
    const { NFTPackage, signature } = await createNFTAndGetSig();

    //claim the NFT and bring it on-chain
    await myLazyMinting
      .connect(addr1)
      .claimNFT(NFTPackage, signature, { value: 20 });

    //Now on chain addr1 is owner of the NFT

    /********** Selling process the purchased NFT ********************/

    //Approve the NFT to the contract address
    await myLazyMinting
      .connect(addr1)
      .setApprovalForAll(myLazyMinting.address, true);

    //set the new selling price of the NFT
    NFTPackage.price = 40;

    //sign the NFT
    const lazyMint = new LazyMint(myLazyMinting.address, addr1);
    const Addr1Signature = await lazyMint.getSignature(NFTPackage);

    const Addr1BalanceBefore = await provider.getBalance(addr1.address);

    /*************************************************************** */

    //Now purchase the NFT from addr2 . price is 40
    expect(
      await myLazyMinting
        .connect(addr2)
        .purchaseNFT(NFTPackage, Addr1Signature, {
          value: 40,
        })
    )
      .to.emit(myLazyMinting, "Transfer")
      .withArgs(addr1.address, addr2.address, NFTPackage.tokenId)
      .and.to.emit(myLazyMinting, "NFTPurchased")
      .withArgs(addr1.address, addr2.address, NFTPackage.tokenId);

    //new owner of this NFT should be, Addr2
    expect(await myLazyMinting.ownerOf(NFTPackage.tokenId)).be.equal(
      addr2.address
    );

    //Addr1 should receive his selling price
    const Addr1BalanceAfter = await provider.getBalance(addr1.address);

    //diff in balance
    const diff = Addr1BalanceAfter.sub(Addr1BalanceBefore);

    //this diff should be the selling price
    expect(diff).be.equal(NFTPackage.price);
  });
});
