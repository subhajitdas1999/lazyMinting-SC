# lazyMinting-SC 

**Table Of Contents**


[Overview](#overview)<br>
[Smart Contracts](#smart-contracts)<br>
[Important Transaction Hash](#important-transaction-hash)<br>
[Project Setup](#project-setup)<br>
[Hardhat Setup](#hardhat-setup)<br>

## **Overview**

Lazy minting is a way to defer the payment of gas fees until NFT is sold.

First a NFTCreator creates NFT (for example : tokenID ,price ,and uri to NFT art) then , the creator sign this NFT with his keys. Till now the NFT is in off-chain (so the creator don't have to worry about gas fees) .Now If any Interested buyer wants to claim the NFT ,then buyer have to mint the NFT first with the signature provided by creator , this is how lazy minting works.

- In this contract, A NFT creator have to register themselves as a minter, before signing any NFT (Creator is one of the minters in the contract).Otherwise Creators NFT cannot be claimed onChain (validation will be failed).This is a one time process .Anyone can become a minter by calling this function .

```
function SetMinterRole(address _minter) public {}
```

After calling this function address _minter will become a minter.

***
- Now if any buyer wants to buy a **off chain** NFT , Buyer have to call this function along with price value of the NFT

```
function claimNFT(NFTPackage memory _NFTPackage, bytes memory _signature) public payable{}
```

_NFTPackage = The NFT details structure ({tokenId:uint256,price:uint256,tokenURI:string})

_signature = Signature of the NFT creator

NOTE : This function is payable function, buyer have to provide the NFT price value while calling this function.

first ,this function will verify the signature , price , minter (creator) role. Then it will mint the NFT to the NFT creator address and after that it will transfer the NFT to buyer. At the end it will send the NFT price value to the NFT creator (signer).

***
- If any one holds some NFT **On Chain** any wants to sell the NFT.

The NFT holder have to approve the NFT token Id to this contract address , by calling this function

```
function setApprovalForAll(address operator, bool approved) public virtual override {}
```

operator = This contract address

approved = true

After approving this contract and seller have to fixed the selling price and sign the NFT.

selling of a NFT is totally off chain .

***

- If anyone wants to buy a NFT which is already **On chain**. Then buyer have to call this function with the NFT details and the signature (provided by NFT seller) along with NFT selling price value

```
function purchaseNFT(NFTPackage memory _NFTPackage, bytes memory _signature) public payable{}
```

_NFTPackage = NFT structure

_signature = signature provided by NFT seller

NOTE :- This is a payable function , buyer have send ether amount along with func parameters.

After verifying all the details, this func will transfer the NFT to the buyer and the price value will be send to NFT seller address.

***
- Events
1. 
```
event ClaimNFTOnChain(address signer, address buyer, uint256 tokenId);
```
This event will emit after the successful execution of **claimNFT** function .

2. 
```
event NFTPurchased(address currentNFTOwner, address NewNFTOwner, uint256 tokenId);
```
This event will emit after the successful execution if **purchaseNFT** function .

***
## **Smart Contracts**

Contracts deployed at Rinkeby network

MyLazyMinting :- [0x58C54666c20059d61008978F56b015d6818b5680](https://rinkeby.etherscan.io/address/0x58C54666c20059d61008978F56b015d6818b5680#code)

***

## **Important Transaction Hash**


claimNFT On Chain : [0x4052940a3cab34b3636f453bc882144902ec164073d4c78fc14eb4d9cd8f154c](https://rinkeby.etherscan.io/tx/0x4052940a3cab34b3636f453bc882144902ec164073d4c78fc14eb4d9cd8f154c)

***

## **Project Setup**

1. clone the repo .

```
git clone https://github.com/subhajitdas1999/lazyMinting-SC.git
```

2. Change directory

```
cd lazyMinting-SC
```

3. Change the branch from master to development

```
git switch development (for now)
```

4. Install the dependencies

```
npm i
```

5. create an .env file . And fill the value as showed in the .env.example file 

***

## **Hardhat Setup**

1. clean the cache files
```
npx hardhat clean
```

2. Run the tests

```
npx hardhat test
```

3. Deploy to the Test network

```
npx hardhat run scripts/deploy.js --network rinkeby
```