// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFTMarketplace is ERC721URIStorage, ReentrancyGuard {
uint256 private _tokenIds;

    struct Listing {
        address seller;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;

    event Minted(address indexed owner, uint256 indexed tokenId, string tokenURI);
    event Listed(address indexed seller, uint256 indexed tokenId, uint256 price);
    event Bought(address indexed buyer, address indexed seller, uint256 indexed tokenId, uint256 price);

    constructor() ERC721("SimpleNFT", "SNFT") {}

    function mintNFT(string calldata tokenURI) external returns (uint256) {
    _tokenIds++;
    uint256 newId = _tokenIds;
    _mint(msg.sender, newId);
    _setTokenURI(newId, tokenURI);
    emit Minted(msg.sender, newId, tokenURI);
    return newId;
}


    function listToken(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(price > 0, "Price must be > 0");
        listings[tokenId] = Listing(msg.sender, price);
        emit Listed(msg.sender, tokenId, price);
    }

    function buyToken(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.price > 0, "Not listed");
        require(msg.value == listing.price, "Incorrect value");

        delete listings[tokenId];
        _transfer(listing.seller, msg.sender, tokenId);

        (bool sent, ) = payable(listing.seller).call{value: msg.value}("");
        require(sent, "Payment failed");
        emit Bought(msg.sender, listing.seller, tokenId, msg.value);
    }

    function totalMinted() external view returns (uint256) {
    return _tokenIds;
}
}
