const { expect } = require("chai");

let rewardContract;
let reward;

let ticketpoolContract;
let ticketpool;

const ticketPrice = 24;

const initialTokenBalance = 100;

let players = []

let playercount = 5

let winner = 2;

let winnerbalance = initialTokenBalance + ticketPrice*(playercount-1);


const deployContracts = async () =>{
  const accounts = await ethers.getSigners();
  deployer = accounts[0]
  players = accounts.slice(1).slice(0,playercount);
  //token for testing
  rewardContract = await ethers.getContractFactory('ERC20Mintable');
  reward = await rewardContract.deploy("ERC20 Token", "TOKEN");
  await reward.deployed();

  ticketpoolContract = await ethers.getContractFactory('TicketPool');
  ticketpool = await ticketpoolContract.deploy("Winning Ticket Pool","TICKT");
  await ticketpool.deployed;

  await ticketpool.setRewardToken(reward.address);
  await ticketpool.setTicketPrice(ticketPrice);
  await ticketpool.setIsMintable(true);

}

const mintInitialBalances = async () => {
  for(const player of players){
    await reward.mint(await player.getAddress(),initialTokenBalance);
  }
}

const buyInitialTickets = async () =>{
  for(const player of players){
    await reward.connect(player).increaseAllowance(ticketpool.address,ticketPrice * 2);
    await ticketpool.connect(player).mintTicket();
  }
}

describe("TicketPool", async () => {
  before("deploy-contracts",deployContracts);
  it("ticket pool should have minting on along with the correct reward token and amount",async ()=> {
    expect(await ticketpool._isMintable()).to.equal(true);
    expect(await ticketpool._rewardTokenAddress()).to.equal(reward.address);
    expect(await ticketpool._ticketCount()).to.equal(0);
    expect(await ticketpool._ticketPrice()).to.equal(ticketPrice);
    await mintInitialBalances();
  });
  it(`all players should all have ${initialTokenBalance - ticketPrice} TOKENS and 1 ticket`,async ()=> {
    await buyInitialTickets();
    for(const player of players){
      expect(await reward.balanceOf(await player.getAddress())).to.equal(initialTokenBalance - ticketPrice);
      expect(await ticketpool.balanceOf(await player.getAddress())).to.equal(1);
    }
  });
  it(`minting should fail after setting mintable to false and trying to mint`,async()=>{
    await ticketpool.setIsMintable(false)
    for(const player of players){
      expect(ticketpool.connect(player).mintTicket()).to.be.revertedWith("ticket minting is not enabled right now");
    }
  })
  it(`should be able to set the reward of id ${winner} to the tokenbalance of contract`,async()=>{
    await expect(ticketpool.setWinner(winner,await reward.balanceOf(ticketpool.address))).not.to.be.reverted;
  })

  it(`the holder of ticket ${winner} should have winnings of ${ticketPrice*playercount}`, async ()=>{
    expect(await ticketpool.winningsOf(winner)).to.equal(ticketPrice*playercount);
  })

  it(`every other ticket should have winnings of ${0}`, async ()=>{
    for(let i = 0; i < await ticketpool._ticketCount(); i++){
      if(i !== winner){
        expect(await ticketpool.winningsOf(i)).to.equal(0);
      }
    }
  })
  it(`every other ticket should fail to claim winnings`, async ()=>{
    for(let i = 0; i < await ticketpool._ticketCount(); i++){
      if(i !== winner){
        await expect(ticketpool.connect(players[i]).claimWinnings(i)).to.be.reverted;
      }
    }
  })

  it(`everyone other than the winner should fail to claim ticket #2`, async ()=>{
    let nowinner = [...players]
    nowinner.splice(winner,1);
    for(const player of nowinner){
      await expect(ticketpool.connect(player).claimWinnings(2)).to.be.reverted;
    }
  })

  it(`the should be able to claim ${winner}`, async ()=>{
    await expect(ticketpool.connect(players[winner]).claimWinnings(winner)).not.to.be.reverted;
  })
 it(`the winner's balance after claiming ticket ${winner} should be ${winnerbalance}`, async ()=>{
   expect(await reward.balanceOf(await players[winner].getAddress())).to.equal(winnerbalance);
  })




});
