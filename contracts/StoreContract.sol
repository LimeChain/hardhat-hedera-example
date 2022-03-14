// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Purchase
{
    address public owner;
    uint public identifier;
    uint public priceInWei;
    uint public blockNumber;
    State public state;
    StoreContract storeManager;

    enum State {CREATED, PAID, CANCELLED}

    constructor(StoreContract _storeManager, address _owner, uint _identifier, uint _priceInWei, uint _blockNumber)
    {
        storeManager = _storeManager;
        owner = _owner;
        identifier = _identifier;
        priceInWei = _priceInWei;
        blockNumber = _blockNumber;

        state = Purchase.State.CREATED;
    }

    receive() external payable
    {
        require(msg.value == priceInWei, "Ether amount should be exact as the product price");
        (bool success,) = address(storeManager).call{value : msg.value}("");

        require(success, "The transaction was unsuccessful");

        state = Purchase.State.PAID;
    }

    function cancelPurchase() public
    {
        require(msg.sender == owner, "Only purchase creator can cancel the order");
        require(state == Purchase.State.PAID, "Only paid purchases can be cancelled");
        require(blockNumber + 100 >= block.number, "Can not rollback the transaction due to exceeding block numbers difference over 100");

        storeManager.refund(owner, identifier, priceInWei);

        state = Purchase.State.CANCELLED;
    }

    fallback() external {}
}

contract StoreContract is Ownable
{
    struct Product {
        uint _identifier;
        uint _quantity;
        uint _priceInWei;
        bool _exists;
    }

    mapping(uint => Product) public products;
    mapping(uint => mapping(address => uint)) public buyers;

    event ProductCreated(uint _identifier, uint _quantity, uint _priceInWei);
    event ProductUpdated(uint _identifier, uint _quantity);
    event PurchaseCreated(address _addr);

    modifier productExists(uint _identifier)
    {
        require(products[_identifier]._exists, "The product doesn't exist");
        _;
    }

    modifier productDoesntExist(uint _identifier)
    {
        require(!products[_identifier]._exists, "The product already exists");
        _;
    }

    function createProduct(uint _identifier, uint _quantity, uint _priceInWei) public
    onlyOwner
    productDoesntExist(_identifier)
    {
        products[_identifier]._identifier = _identifier;
        products[_identifier]._quantity = _quantity;
        products[_identifier]._priceInWei = _priceInWei;
        products[_identifier]._exists = true;

        emit ProductCreated(_identifier, _quantity, _priceInWei);
    }

    function addQuantityToProduct(uint _identifier, uint _quantity) public
    onlyOwner
    productExists(_identifier)
    {
        products[_identifier]._quantity += _quantity;

        emit ProductUpdated(_identifier, products[_identifier]._quantity);
    }

    function createPurchase(uint _identifier) public
    productExists(_identifier)
    {
        require(products[_identifier]._quantity > 0, "Insufficient quantity");
        require(buyers[_identifier][msg.sender] == 0, "Only 1 product per user is permitted");

        Purchase purchase = new Purchase(this, msg.sender, _identifier, products[_identifier]._priceInWei, block.number);
        emit PurchaseCreated(address(purchase));

        buyers[_identifier][msg.sender]++;
        products[_identifier]._quantity--;
    }

    function balanceOfContract() public view returns (uint256)
    {
        return address(this).balance;
    }

    function refund(address productOwner, uint identifier, uint priceInWei) public
    {
        require(tx.origin == productOwner, "Only product owner can do a refund");
        require(buyers[identifier][tx.origin] == 1, "Invalid product");

        (bool success,) = address(productOwner).call{value : priceInWei}("");
        require(success, "The transaction was unsuccessful");

        buyers[identifier][tx.origin]--;
        products[identifier]._quantity++;
    }

    receive() payable external {}
}