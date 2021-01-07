console.log("Sanity Check: JS is working!");
 
let backendRoute = new URL("http://localhost:8000/api");

let jsonResult = [];

// make PDF with jspdf and jspdf-autotable
// learn more from my "all_links" repo
// Default export is a4 paper, portrait, using millimeters for units
const convertAndDownloadPDF = (jsonResult) => {
    console.log('jsonResult: ',jsonResult);
    let header = Object.keys(jsonResult[0]);
    let data = jsonResult.map(e=>Object.values(e));
    // body need spread operartor because is nested
    console.log("header: ",header);
    console.log("data: ",...data);
    var doc = new jsPDF();
    doc.autoTable({
        head: [header],
        body: [...data],
    })
    doc.save('test.pdf')
};

// html attribute download file
// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
const download = (filename, text) => {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};

// converter JSON to CSV return string, than download
const convertAndDownloadCSV = (jsonResult) => {
    // incase of result is not an array of object, convert to json string than, to json object
    console.log('jsonResult: ',jsonResult);
    var objArray = JSON.stringify(jsonResult);
    console.log('objArray: ', objArray);
    // usually "array" is same as given "jsonResult"
    let array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    console.log('array: ', array);
    let str = Object.keys(array[0]).join()+'\r\n';
    console.log('keys: ', str);
    for (let i = 0; i < array.length; i++) {
        console.log(i,': ', array[i]);
        let line = '';
        for (let index in array[i]) {
            if (line != '') {
            line += ',';
            }
            line += array[i][index];
            console.log(index,': ', line);
        }
            str += line + '\r\n';
    }
    download('test.csv', str);
};

// add downloadable buttons PDF CSV before scrape result
const generateDownloadButtons = (htmlElement) => {
    let buttonPDF = document.createElement('button');
    buttonPDF.id = "btnpdf";
    buttonPDF.innerHTML = "Download PDF";
    buttonPDF.className = "btn btn-info mt-2 mb-2";
    let span = document.createElement('span');
    span.innerHTML = ' ';
    let buttonCSV = document.createElement('button');
    buttonCSV.id = "btncsv";
    buttonCSV.innerHTML = "Download CSV";
    buttonCSV.className = "btn btn-info mt-2 mb-2";
    htmlElement.appendChild(buttonPDF);
    htmlElement.appendChild(span);
    htmlElement.appendChild(buttonCSV);
};

const getScrape = async (backendRoute, formObj) => {
    let jr = [];
    try {
        const response = await fetch(backendRoute, {
            method: 'POST', // or 'PUT'
            body: JSON.stringify(formObj), // data can be `string` or {object}!
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('response',response);
        let json = await response.json();
        // DB version I have to skip "_id" column
        // json = json.map(key => { 
        //     delete key._id; 
        //     return key; 
        // });
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        generateDownloadButtons(mList);
        let pre = document.createElement('pre');
        pre.innerHTML = JSON.stringify(json, null, 4);
        mList.appendChild(pre);
        jr = json;
    }catch (error) {
        console.log(error);
    }
    return jr;
};

// fetch to backend for all saved data from DB
const getAllSavedData = async (backendRoute) => {
    try {
        const response = await fetch(backendRoute);
        const json = await response.json();
        // DB version I have to skip "_id" column, DB has multiple documents, need to loop
        json.forEach(e => {
            e.resultlinks.map(k => {
                delete k._id;
                return k;
            });
        });
        console.log('json',json);
        let mList = document.getElementById('result-list');
        mList.innerHTML = '';
        let pre = document.createElement('pre');
        pre.innerHTML = JSON.stringify(json, null, 4);
        mList.appendChild(pre);
    }catch (error) {
        console.log(error);
    }
};

// submit button clicked, pass form data into scrape function and invoke it
// $(document).ready(function(){
$(function(){
    // $("#button1").click(function(){
    $("#button1").on("click", function(){
        let formArr = $("#form1").serializeArray();
        // convert form array of objects to an object of properties
        let formObj = formArr.reduce((map, obj) => {
            map[obj.name] = obj.value;
            return map;
        }, {});
        document.getElementById('result-list').innerHTML = 
        '<p style="color:blue;font-size:46px;"><strong> ... Find related searchs please wait ... </strong></p>';
        console.log('formObj',formObj);

        // async function have to be call inside async function, so use a iife empty function here
        (async () => {
            jsonResult = await getScrape(backendRoute, formObj)
        })();
    });

    // need start with static element for event binding on dynamically created elements
    $("#result-list").on("click", "#btnpdf", function(){
        convertAndDownloadPDF(jsonResult);
    });

    // onclick convert JSON to CSV and download it
    $("#result-list").on("click", "#btncsv", function(){
        convertAndDownloadCSV(jsonResult);
    });
});
