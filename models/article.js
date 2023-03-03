const mongoose = require('mongoose');
const ArticlesSchema = new mongoose.Schema({
    id : {
        type : String,
        required : true
        // maxLengthd :32
    },
    title : {
        type : String
        //string typee
    },
    description : {
        type : String
    },
    markdown :{
        type : String
    }
});
//mongoose reference

const article = mongoose.model('article', ArticlesSchema);

module.exports = article;