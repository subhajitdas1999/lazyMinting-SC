//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

/// @title A Lazy Minting Contract
/// @author Subhajit Das
/// @notice You can use this contract to claim an off chain NFT, purchase onchain NFT and other ERC721 operations
/// @dev This contract uses a extended version of ERC721 ,which is ERC721URIStorage . This extension helps to store tokenURI with respective tokenID.
contract MyLazyMinting is ERC721URIStorage, EIP712, AccessControl {
    /// @dev using ECDSA from openzeppelin to work with signature verification. 
    using ECDSA for bytes32;

    /// @dev Minter role hash
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    ///@dev NFT package format
    struct NFTPackage {
        uint256 tokenId;
        uint256 price;
        string tokenURI;
    }

    constructor() ERC721("My Lazy Minting", "MLM") EIP712("LazyMint", "1") {}

    ///@notice To claim the OFF CHAIN NFT , with signature (provided by NFT creator) and NFTPackage
    ///@dev This function will mint the NFT and transfers it to buyer
    function claimNFT(NFTPackage memory _NFTPackage, bytes memory _signature)
        public
        payable
    {
        ///@dev verify the signature and with NFT details to get the address of the signer(creator)
        address signer = verify(_NFTPackage, _signature);
        ///@dev This signer should have the minter Role , Otherwise revert
        require(
            hasRole(MINTER_ROLE, signer),
            "Signature provided is not from a minter"
        );

        ///@dev check the price value provided by the buyer
        require(msg.value >= _NFTPackage.price, "Send more ether");

        ///@dev mint the NFT to the signer (creator) address
        _safeMint(signer, _NFTPackage.tokenId);

        ///@dev set the token uri with it's token Id
        _setTokenURI(_NFTPackage.tokenId, _NFTPackage.tokenURI);

        ///@dev Transfer the NFT to the buyer from NFT signer
        _transfer(signer, msg.sender, _NFTPackage.tokenId);

        ///@dev transfer the ether amount to NFT signer(creator)
        payable(signer).transfer(_NFTPackage.price);

        //emit the events
        emit ClaimNFTOnChain(signer, msg.sender, _NFTPackage.tokenId);
    }

    ///@notice Buy a NFT that is already on chain
    ///@dev Before buying a On chain NFT , first NFT owner have list his NFT for sale and sign it, then a buyer can buy on chain NFT.
    ///@dev Selling A NFT is totally OFF CHAIN.
    function purchaseNFT(NFTPackage memory _NFTPackage, bytes memory _signature)
        public
        payable
    {
        ///@dev get the current owner of the NFT
        address currentNFTOwner = ownerOf(_NFTPackage.tokenId);
        ///@dev Check NFT is valid
        require(currentNFTOwner != address(0), "NFT is not minted yet");
        ///@dev Get the signer of the NFT from signature and NFT details
        address signer = verify(_NFTPackage, _signature);
        ///@dev NFT signer should be the current owner of the NFT
        require(signer == currentNFTOwner, "Signer is not valid");

        ///@dev check the price provided by the buyer
        require(msg.value >= _NFTPackage.price, "Send more ether");

        ///@dev NFT is approved for sale
        ///@dev In the selling process NFT holder have to approve the NFT to this contract
        require(
            isApprovedForAll(currentNFTOwner, address(this)),
            "NFT is not Approved"
        );

        ///@dev transfer the NFT from current owner to buyer
        ///@dev making a low level call , because this contract have to call this transferFrom function. Otherwise buyer will call this transferFrom function
        ///@dev we want contract to call the transferFrom function
        (bool success, ) = address(this).call(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                currentNFTOwner,
                msg.sender,
                _NFTPackage.tokenId
            )
        );

        ///@dev if anything went wrong at the time of transferring, revert.
        require(success, "Something went wrong ,try again");

        ///@dev send the NFT selling price to the NFTSeller
        payable(currentNFTOwner).transfer(msg.value);

        //emit the events
        emit NFTPurchased(currentNFTOwner, msg.sender, _NFTPackage.tokenId);
    }

    ///@notice A NFT creator have to register themselves as minter .Otherwise their signed NFT cannot be claimed on chain from off-chain
    ///@dev Set the function caller as a minter
    function SetMinterRole(address _minter) public {
        _grantRole(MINTER_ROLE, _minter);
    }

    ///@dev verify the NFT and the signature of NFT creator
    function verify(NFTPackage memory _NFTPackage, bytes memory _signature)
        internal
        view
        returns (address)
    {   
        ///@dev Get the digest from NFT details
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    keccak256(
                        "NFTPackage(uint256 tokenId,uint256 price,string tokenURI)"
                    ),
                    _NFTPackage.tokenId,
                    _NFTPackage.price,
                    keccak256(bytes(_NFTPackage.tokenURI))
                )
            )
        );

        ///@dev Recover the signer address from digest and signature
        ///@dev See openzeppelin ECDSA cryptography
        address signer = digest.toEthSignedMessageHash().recover(_signature);
        return signer;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /* All Events */
    event ClaimNFTOnChain(address signer, address buyer, uint256 tokenId);
    event NFTPurchased(
        address currentNFTOwner,
        address NewNFTOwner,
        uint256 tokenId
    );
}
