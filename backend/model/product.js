const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    platform:String,
    name:String,
    register_price:Number,
    price:Number,
    description:String,
    image:String,
    url:String,
    currency:String,
    inStock:String,
    category:String,
    status:String,
    brand:String,
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    rating:Number,
    createdAt:Date,
    status:String,
    last_check_date:Date,
    lastcheck:[
        {
            date:Date,
            price:Number
        }
    ]
})

module.exports = mongoose.model('Product',productSchema)