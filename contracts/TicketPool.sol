//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./_external/openzeppelin/token/ERC20/IERC20.sol";
import "./_external/openzeppelin/token/ERC721/ERC721.sol";
import "./_external/openzeppelin/access/Ownable.sol";


contract TicketPool is ERC721, Ownable {

  IERC20 private _rewardToken;

  address public _rewardTokenAddress;
  uint256 public _ticketPrice;
  uint256 public _ticketCount = 0;

  uint256 public _pendingRewards = 0;
  bool public _isMintable = false;

  mapping (uint256 => uint256) public _rewardAmounts;

  constructor(string memory name, string memory symbol) ERC721(name,symbol) Ownable() {
  }

  function setRewardToken(address tokenAddress) public onlyOwner {
    _isMintable = false;
    _rewardTokenAddress = tokenAddress;
    _rewardToken = IERC20(tokenAddress);
  }

  function setTicketPrice(uint256 amount) public onlyOwner {
    _isMintable = false;
    _ticketPrice = amount;
  }

  function setIsMintable(bool flag) public onlyOwner {
    _isMintable = flag;
  }

  function mintTicket() public {
    require(_isMintable, "ticket minting is not enabled right now");
    uint256 allowance = _rewardToken.allowance(msg.sender, address(this));
    require(allowance >= _ticketPrice, "insufficient allowance");
    _rewardToken.transferFrom(msg.sender,address(this),_ticketPrice);
    ERC721._safeMint(msg.sender,_ticketCount);
    _ticketCount = _ticketCount + 1;
  }
  function setWinner(uint256 tokenId, uint256 amount) public virtual onlyOwner {
    uint256 poolBalance = _rewardToken.balanceOf(address(this));
    uint256 newPendingRewards = _pendingRewards + amount;
    require(newPendingRewards <= poolBalance,"cant give out more rewards than you have");
    _rewardAmounts[tokenId] = amount;
    _pendingRewards = newPendingRewards;
  }

  // this will claim any tokens available to that NFT
  function claimWinnings(uint256 tokenId) public virtual {
    require(ERC721._isApprovedOrOwner(_msgSender(), tokenId), "the claimer is not owner nor approved");
    uint256 winnings = _rewardAmounts[tokenId];
    require(winnings > 0, "this ticket is not entitled to any winnings!");
    _rewardToken.transfer(msg.sender,winnings);
    _rewardAmounts[tokenId] = 2;
    _pendingRewards = _pendingRewards - winnings;
  }

  function winningsOf(uint256 tokenId) public view virtual returns (uint256) {
    return _rewardAmounts[tokenId];
  }

}
