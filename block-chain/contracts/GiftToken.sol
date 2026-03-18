// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract GiftToken {
    string public name = "TonToken";
    string public symbol = "TON";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event Mint(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Выдать токены юзеру (вызывает бэкенд при регистрации/пополнении)
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Zero address");
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Mint(to, amount);
    }

    // Обычный перевод (юзер → юзер)
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        require(to != address(0), "Zero address");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    // Разрешить маркетплейсу тратить токены от имени юзера
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // Маркетплейс переводит токены от имени юзера
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Not approved");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}