// REQUIREMENTS

// native
const path = require('path');

// 3rd party
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require("node-fetch");
var userAgent = require('user-agents');
const Sitemapper = require('sitemapper');
const sitemap = new Sitemapper();
sitemap.timeout = 5000;

// local
const app = express();
const port = process.env.PORT || 8000;

// MIDDLEWARE
app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(__dirname + '../node_modules/bootstrap/dist/css'));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// allow cors to access this backend
app.use( (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// INIT SERVER
app.listen(port, () => {
    console.log(`Started on port ${port}`);
});

// helper functions

function renInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}

const loopUrlsForH1H2 = async (page, navigationPromise, urls) => {
    let resultArray = [];
    let response = null;
    let numOfH1 = 0;
    let numOfH2 = 0;
    let curUrl = '';
    for (let i = 0; i < urls.length; i++) {
        curUrl = urls[i];
        response = await page.goto(curUrl, { timeout: 10000, waitUntil: 'load' });
        await navigationPromise;
        await page.waitForTimeout(renInt(1000, 2000));
        numOfH1 = await page.evaluate((selector) => {
            let els = Array.from(document.querySelectorAll(selector));
            return els ? els.length : "h1 error";
        }, 'h1');
        await page.waitForTimeout(renInt(500, 600));
        numOfH2 = await page.evaluate((selector) => {
            let els = Array.from(document.querySelectorAll(selector));
            return els ? els.length : "h2 error";
        }, 'h2');
        await page.waitForTimeout(renInt(500, 600));
        console.log({url: curUrl, numOfH1: numOfH1, numOfH2: numOfH2, status: response._status});
        resultArray.push({url: curUrl, numOfH1: numOfH1, numOfH2: numOfH2, status: response._status});
    }
    return resultArray;
}

// ROUTES
// root
app.get('/', function (req, res) {
    res.send('hello world');
});

// scrape for all "a" tag's "href" content of given page
// standard the page
let scrape = async (targetPage) => {
    let results = [];
    let hrefs = [];
    // get url from xml sitemap page
    if(targetPage.endsWith('.xml')){
        try{
            // hrefs = await (await sitemap.fetch(targetPage)).sites;
            let getUrls = await sitemap.fetch(targetPage);
            hrefs = await getUrls.sites;
        }catch(error) {
            console.log("Error, no site url");
        }   
    }
    else{
        console.log('This is not a xml sitemap link');
    }

    //
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], ignoreHTTPSErrors: true, slowMo: 100}); // need for real server
    // var browser = await puppeteer.launch({headless: false, ignoreHTTPSErrors: true, slowMo: 100});  // need to slow down to content load

    var page = await browser.newPage();
    // deal with navigation and page timeout, see the link
    // https://www.checklyhq.com/docs/browser-checks/timeouts/
    var navigationPromise =  page.waitForNavigation();

    await page.setUserAgent(userAgent.random().toString());
    // await page.setDefaultNavigationTimeout(0);   // use when set your own timeout
    // hrefs.unshift('https://httpstat.us/404')    // test for 404 page
    results = await loopUrlsForH1H2(page, navigationPromise, hrefs);

    await page.close();
    await browser.close();
    console.log("done scraping");
    return results;
};

// post, get form data from frontend
app.post('/api', async function (req, res) {
    req.setTimeout(0);
    let targetPage = req.body.targetPage || "";
    await scrape(targetPage)
    .then((resultArr)=>{
        res.send(resultArr);
    }).catch(() => {}); 
});