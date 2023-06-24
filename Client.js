import fs from 'fs';
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8080');

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('open', () => {
  ws.send('something');
});

ws.on('message', (data) => {
  console.log('received:', data);
});

let parsedData = {};

function readConfigFile() {
  const jsonData = fs.readFileSync('data.json', 'utf-8');
  parsedData = JSON.parse(jsonData);
}

function addNewOrder(order) {
  const configFilePath = 'data.json';
  let configData = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));

  configData.orders.push(order);

  fs.writeFileSync(configFilePath, JSON.stringify(configData, null, 2));

  console.log('New order added:', order);
}

setTimeout(function () {
  const newOrder1 = {
    customerId: 4,
    productList: {
      eggs: 12,
      tomatoes: 3,
      bread: 1
    }
  };

  addNewOrder(newOrder1);
  ws.send(JSON.stringify(newOrder1));

  const newOrder2 = {
    customerId: 4,
    productList: {
      milk: 3,
      bread: 2,
    },
  };

  addNewOrder(newOrder2);

  readConfigFile();
  
  runProgram(parsedData.output.minutes.program * 60000, parsedData.output.poweredOn);
}, 5000);
