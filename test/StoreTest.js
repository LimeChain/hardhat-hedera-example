const {expect} = require("chai");
const hre = require('hardhat');
const hethers = hre.hethers;
let contracts = {};

async function deployContractByName(name) {
  if (contracts.hasOwnProperty(name)) {
    const artifact = await hre.artifacts.readArtifact(name);

    return await hethers.getContractAtFromArtifact(artifact, contracts[name]);
  }

  const contract = await hethers.getContractFactory(name);
  const deployedContract = await contract.deploy();

  await deployedContract.deployed();

  contracts[name] = deployedContract.address;

  return deployedContract;
}

describe("StoreContract", function () {
  it("check if initial balance is 0", async function () {
    const StoreContract = await deployContractByName("StoreContract");

    const balance = await StoreContract.balanceOfContract();
    expect(balance).to.equal(0);
  });

  it("should create a product", async function () {
    const StoreContract = await deployContractByName("StoreContract");
    const tx = await StoreContract.createProduct("100", "33", hethers.utils.parseUnits("1", "hbar"));
    const product = await tx.wait();

    expect(product).to.be.an("Object");

    const event = product.events.find(event => event.event === "ProductCreated");

    expect(event).to.not.be.undefined;
    expect(event.args).to.be.an("Array");
    expect(event.args).to.haveOwnProperty("_identifier");
    expect(event.args._identifier).to.equal("100");
    expect(event.args).to.haveOwnProperty("_quantity");
    expect(event.args._quantity).to.equal("33");
    expect(event.args).to.haveOwnProperty("_priceInWei");
    expect(event.args._priceInWei).to.equal(hethers.utils.parseUnits("1", "hbar"));
  });

  it("should not be able to create a same product twice", async function () {
    const StoreContract = await deployContractByName("StoreContract");

    try {
      await StoreContract.createProduct("100", "33", hethers.utils.parseUnits("1", "hbar"));
    } catch (e) {
      expect(e.code).to.equal('CONTRACT_REVERT_EXECUTED');
      return;
    }

    expect(false).to.equal(true);
  });

  it("should not be able to create a product with a non-owner address", async function () {
    const StoreContract = await deployContractByName("StoreContract");
    const [owner, addr1] = await hethers.getSigners();

    try {
      await StoreContract.connect(addr1).createProduct("100", "33", hethers.utils.parseUnits("1", "hbar"));
    } catch (e) {
      expect(e.code).to.equal('CONTRACT_REVERT_EXECUTED');
      return;
    }

    expect(false).to.equal(true);
  });

  it("add quantity to product", async function () {
    const StoreContract = await deployContractByName("StoreContract");
    const quantityBefore = (await StoreContract.products("100"))['_quantity'].toNumber();

    await StoreContract.addQuantityToProduct("100", "100");

    const updatedProduct = await StoreContract.products(100);
    expect(updatedProduct).to.be.an("Array");
    expect(updatedProduct).to.haveOwnProperty("_identifier");
    expect(updatedProduct._identifier).to.equal("100");
    expect(updatedProduct).to.haveOwnProperty("_quantity");
    expect(updatedProduct._quantity).to.equal(quantityBefore + 100);
    expect(updatedProduct).to.haveOwnProperty("_priceInWei");
    expect(updatedProduct._priceInWei).to.equal(hethers.utils.parseUnits("1", "hbar"));
  });

  it("should not be able to update quantity with a non-owner address", async function () {
    const StoreContract = await deployContractByName("StoreContract");
    const [owner, addr1] = await hethers.getSigners();

    try {
      await StoreContract.connect(addr1).addQuantityToProduct("100", "33");
    } catch (e) {
      expect(e.code).to.equal('CONTRACT_REVERT_EXECUTED');
      return;
    }

    expect(false).to.equal(true);
  });

  it("should not be able to update quantity of non-existing product", async function () {
    const StoreContract = await deployContractByName("StoreContract");

    try {
      await StoreContract.addQuantityToProduct("200", "33");
    } catch (e) {
      expect(e.code).to.equal('CONTRACT_REVERT_EXECUTED');
      return;
    }

    expect(false).to.equal(true);
  });

  it("should create a purchase", async function () {
    const [owner] = await hethers.getSigners();
    const StoreContract = await deployContractByName("StoreContract");

    const quantityBefore = (await StoreContract.products("100"))._quantity;
    const buyersBefore = (await StoreContract.buyers("100", owner.address));
    expect(buyersBefore).to.equal(0);

    const tx = await StoreContract.createPurchase("100");
    const purchase = await tx.wait();
    expect(purchase).to.be.an("Object");

    const event = purchase.events.find(event => event.event === "PurchaseCreated");

    expect(event).to.not.be.undefined;
    expect(event.args).to.be.an("Array");
    expect(event.args).to.haveOwnProperty("_addr");

    const quantityAfter = (await StoreContract.products("100"))._quantity;
    expect(quantityAfter).to.equal(quantityBefore - 1);

    const buyersAfter = (await StoreContract.buyers("100", owner.address));
    expect(buyersAfter).to.equal(1);
  });

  it("should not be able ot create a purchase with non-existing identifier", async function () {
    const StoreContract = await deployContractByName("StoreContract");

    try {
      await StoreContract.createPurchase("100");
    } catch (e) {
      expect(e.code).to.equal('CONTRACT_REVERT_EXECUTED');
      return;
    }

    expect(false).to.equal(true);
  });

  it("should not be able to make a refund if not the owner", async function () {
    const [owner, addr1] = await hethers.getSigners();
    const StoreContract = await deployContractByName("StoreContract");
    const productId = Math.floor(Math.random() * (9000) + 1000);

    await StoreContract.createProduct(productId, "33", hethers.utils.parseUnits("1", "hbar"));

    const tx = await StoreContract.connect(addr1).createPurchase(productId);
    const purchase = await tx.wait();
    const event = purchase.events.find(event => event.event === "PurchaseCreated");
    const purchaseAddr = event.args._addr;

    const payment = await addr1.sendTransaction({
      to: purchaseAddr,
      value: hethers.utils.parseUnits("1", "hbar")
    });

    const PurchaseContract = await hethers.getContractAt("Purchase", purchaseAddr);

    try {
      await PurchaseContract.cancelPurchase();
    } catch (e) {
      expect(e.code).to.equal('CONTRACT_REVERT_EXECUTED');
      return;
    }

    expect(false).to.equal(true);
  });

  it("should not be able to make a refund for unpaid purchase", async function () {
    const [owner, addr1] = await hethers.getSigners();
    const StoreContract = await deployContractByName("StoreContract");
    const productId = Math.floor(Math.random() * (9000) + 1000);

    await StoreContract.createProduct(productId, "33", hethers.utils.parseUnits("1", "hbar"));

    const tx = await StoreContract.connect(addr1).createPurchase(productId);
    const purchase = await tx.wait();
    const event = purchase.events.find(event => event.event === "PurchaseCreated");
    const purchaseAddr = event.args._addr;

    const PurchaseContract = await hethers.getContractAt("Purchase", purchaseAddr);

    try {
      await PurchaseContract.connect(addr1).cancelPurchase();
    } catch (e) {
      expect(e.code).to.equal('CONTRACT_REVERT_EXECUTED');
      return;
    }

    expect(false).to.equal(true);
  });
});
