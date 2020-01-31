//https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}
const axios = require('axios');
var fs = require('fs'); 
const csv = require('fast-csv');
const path = require('path');

var queue = [];

function enqueue(address) {
  queue.push(address);
}

function pop() {
  return queue.shift();
}

function getUrl(address) {
  return `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}`
}

function isVerified(address) {
  return axios.get(getUrl(address))
  .then(function (response) {
    // handle success
    if(response.data.result[0].SourceCode == "" || response.data.result[0].SourceCode == undefined) {
      return {
        status: false,
        code : ""
      };
    }
    else {
      return {
        status: true,
        code : response.data.result[0].SourceCode
      };
    }
  })
}

function saveToSolidity(address, code) {
  fs.writeFile(`contracts/${address}.sol`, code, function(err) {
    if(err) {
      return console.log(err);
    }
  });
}

async function download(){
  await fs.createReadStream(path.resolve(__dirname, 'addresses.csv'))
  .pipe(csv.parse({ headers: true }))
  .on('error', error => console.error(error))
  .on('data', async(row) => {
    await isVerified(row.receipt_contract_address)
    .catch(function (err){
      enqueue(row.receipt_contract_address);
    })
    .then((res) =>{
      console.log(res);
      if(res.status) {
        saveToSolidity(row.receipt_contract_address, res.code);
      }
    });
  })
  .on('end', rowCount =>{
    console.log(`Parsed ${rowCount} rows`)
    console.log(`Failed for ${queue.length} contracts, Retrying...`);
  });

}

download();
