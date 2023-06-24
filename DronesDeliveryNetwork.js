import { readFileSync } from 'fs';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    console.log('received: %s', data);
  });

  ws.send('something');
});

let parsedData = {};

function readConfigFile() {
   const jsonData = readFileSync('data.json', 'utf-8');
   parsedData = JSON.parse(jsonData);
}

function deliver(warehouseX, warehouseY, customerX, customerY)
{
    const x = Math.abs(warehouseX - customerX);
    const y = Math.abs(warehouseY - customerY);

    const diagonalMoves = Math.min(x, y);
    const straightMoves = Math.abs(x - y);
    const totalMoves = diagonalMoves + straightMoves;
    
    if (parsedData.output.poweredOn)
    {
        console.log(`Package delivered in ${totalMoves} min`); //notification
    }
    return totalMoves + 5; // 1min for every move + 5 min picking up the order
}

function useDrone(time)
{
    const kW = /(\d+)kW/;
    const W = /(\d+)W/;

    let allCapacitiesZero = true;
    for (let drone of parsedData.typesOfDrones) {
        if (drone.capacity.match(W)[1] > 0 ) {
            allCapacitiesZero = false;
            break;
        }
    }

    if (allCapacitiesZero)
    {
        for (let i = 0; i <  parsedData.typesOfDrones.length; ++i)
        {
            parsedData.typesOfDrones[i].capacity = dronesCopies[i];
        }
    }

    let timeOfDay = 15*60;
    let randomIndex = Math.floor(Math.random() * parsedData.typesOfDrones.length);
    let randomDrone = parsedData.typesOfDrones[randomIndex];

    let capacity = 0;
    let consumption = randomDrone.consumption.match(W)[1]; 
    if (randomDrone.capacity.match(kW)){
        capacity = randomDrone.capacity.match(kW)[1];
        capacity *= 1000;
    } 
    else if (randomDrone.capacity.match(W))
    {
        capacity = randomDrone.capacity.match(W)[1]
    }

    if (timeOfDay > 0)
    {
        timeOfDay -= time;
    }
    else
    {
        timeOfDay = 15 * 60;
        for (let i = 0; i <  parsedData.typesOfDrones.length; ++i)
        {
            parsedData.typesOfDrones[i].capacity = dronesCopies[i];
        }
    }

    let batteryUsed = time * consumption;
    if (capacity < batteryUsed)
    {
        randomIndex = Math.floor(Math.random() * parsedData.typesOfDrones.length);
        randomDrone = parsedData.typesOfDrones[randomIndex];
    }
    else
    {
        capacity -= batteryUsed;
        randomDrone.capacity = `${capacity}W`; 
    }

    if (parsedData.output.poweredOn) {
        console.log(`Battery used: ${batteryUsed}W`);
        console.log(`Remaining capacity: ${capacity}W`);
    }
}

function processOrder(order)
{
    const id = order.customerId;
    let x = 0;
    let y = 0;
    for (let customer of parsedData.customers)
    {
        if (customer.id == id)
        {
            x = customer.coordinates.x;
            y = customer.coordinates.y;
        }
    }
    
    let distance = 0;
    let position = 0;
    let shortestDistance = Math.sqrt((x - parsedData.warehouses[0].x)*(x - parsedData.warehouses[0].x) + (y - parsedData.warehouses[0].y)*(y - parsedData.warehouses[0].y));
    for (let i = 1; i < parsedData.warehouses.length; ++i)
    {
        distance = Math.sqrt((x - parsedData.warehouses[i].x)*(x - parsedData.warehouses[i].x) + (y - parsedData.warehouses[i].y)*(y - parsedData.warehouses[i].y));
        if (distance < shortestDistance)
        {
            shortestDistance = distance;
            position = i;
        }
    }

    let time = deliver(parsedData.warehouses[position].x, parsedData.warehouses[position].y, x, y);
    return time;
}

function runProgram(programMilliseconds, output)
{
    let totalTime = 0; 
    const dronesCopies = [];
    for (let drone of parsedData.typesOfDrones)
    {
        dronesCopies.push(drone.capacity);
    }

    let allTimes = [];
    for (let order of parsedData.orders)
    {
        let time = processOrder(order)
        totalTime += time;
        allTimes.push(time);

        useDrone(time);
    }

    let numbersOfDrones = parsedData.orders.length;
    totalTime +=  numbersOfDrones * 20; // 20min for recharge
    let sum = 0;
    for (let i = 0; i < allTimes.length; ++i)
    {
        sum += allTimes[i];
    }

    let averageTime = Math.ceil(sum / parsedData.orders.length);

    if (output) {
        console.log(`Total time: ${totalTime} min`);
        console.log(`Drones that we need at maximum: ${numbersOfDrones}`);
        console.log(`Average time for a single delivery is: ${averageTime} min`)
    }

    if (output && parsedData.output.minutes.program > 0) { 
        setTimeout(() => {
            console.log('Program completed.');
            process.exit(0);
        }, programMilliseconds);
    }
}

function startProgram() {
    readConfigFile();

    const programMinutes = parsedData.output.minutes.program;
    const realMilliseconds = parsedData.output.minutes.real;
    const programMilliseconds = (programMinutes / realMilliseconds) * 60000; // Convert minutes to milliseconds

    runProgram(programMilliseconds, parsedData.output.poweredOn);
  
    // Read the configuration file periodically (every program minute)
    setInterval(() => {
      readConfigFile();
      // Process new orders here
    }, programMinutes * 60000);
}
  
startProgram();