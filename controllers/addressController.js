const user = require("../models/userModel");
const apiResponse = require("../utils/responsehandler");
const Address = require("../models/addressModel");
const User = require("../models/userModel");

const createAddress = async (req, res) => {
  try {
    const { addressType, latitude, longitude, address } = req.body;

    const userId = req.user.userId;

    // Check if the user has already added a "home" address
    const homeAddress = await Address.findOne({
      userId: userId,
      addressType: "home",
    });
    if (addressType === "home" && homeAddress) {
      return res
        .status(400)
        .json({ message: "You can only add one home address." });
    }

    // Check if the user has already added an "office" address
    const officeAddress = await Address.findOne({
      userId: userId,
      addressType: "office",
    });
    if (addressType === "office" && officeAddress) {
      return res
        .status(400)
        .json({ message: "You can only add one office address." });
    }

    // Create new address
    const newAddress = new Address({
      addressType,
      latitude,
      longitude,
      address,
      userId,
    });
    await newAddress.save();
    res.status(201).json(newAddress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find();
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAddressbyUserId = async (req, res) => {
  try {
    const address = await Address.find({ userId: req.user.userId });
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }
    res.status(200).json(address);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAddress = async (req, res) => {
  try {
    const updates = req.body;
    const { id } = req.params;

    const updatedAddress = await Address.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.status(200).json(updatedAddress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const deletedAddress = await Address.findByIdAndDelete(req.params.id);
    if (!deletedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }
    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const isAddressSelected = async(req, res) => {
  try {
    // const userId = req.body.userId;
    const { addressId, userId } = req.body;
    const addresses = await Address.find({userId});
    
    const updatedAddress = addresses.map((address) => {
      if (address.id.toString() === addressId ) {
        address.isSelected = 1;
      }else{
        address.isSelected = 0;
      }
      return address;
    })
    res.status(200).json({
      success : true,
      status: 200,
      message: "address selected successfully",
      data : updatedAddress
    });
  }
  catch(error){
    return res.status(500).json({
      success:false,
      status: 500,
      message: "Internal Server Error",
      error : error.message
    })
  }
};

module.exports = {
  createAddress,
  getAddresses,
  getAddressbyUserId,
  updateAddress,
  deleteAddress,
  isAddressSelected,
};
