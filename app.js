const express=require("express");
const app=express();//express fnctn returns
const port=8000;
const path=require("path");
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));//two underscores

const mongoose = require('mongoose');
const article = require("./models/article");
mongoose.connect("mongodb://127.0.0.1:27017/ArticlesDB") // can also use localhost in place of 127.0.0.1
.then(()=>{
    console.log("DB CONNECTED!!");
   })
.catch((err)=>{
})




const {v4: uuid}=require('uuid');
// const methodOverride=require("method-override");
app.use(express.urlencoded({extended:true}));
// app.use(methodOverride('_method'));


let art=[
    {
        id:uuid(),
        title: "john",
        desc:"this is first comment",
        mark:"fggj"
    }
]






// const methodOverride=require("method-override");
app.get('/',(req,res)=>{
    const articles = article.find();
    // art=res.json(articles);
    res.render('index',{art});
})

app.get('/article/new',(req,res)=>{
    res.render('add');
})


app.get('/delete/:artid',(req,res)=>{
    const {artid}=req.params;

})

// app.get('')
app.post('/this-is-a-new-article',(req,res)=>{
    console.log(req.body);
    const {title,desc,mark}=req.body;
    const artt = new article({
            id:uuid(),
            title: `${title}`,
            description : `${desc}`,
            markdown : `${mark}`
        });
        artt.save().then(()=>{
            res.render("/");
        }).catch((err)=>{
            console.log(err);
        })
    art.push({id:uuid() , title , desc,mark});
    res.render('new_article',{title,desc,mark});
})

app.listen(port,()=>{
    console.log(`server is running at ${port}`);
});
