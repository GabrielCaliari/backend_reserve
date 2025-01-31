import { fork } from 'child_process';

class Queue {
    constructor(concurrency = 2) {
        this.items = []; // Itens na fila
        this.isProcessing = false; // Status do processamento
        this.concurrency = concurrency; // Quantos processos simultâneos
    }

    // Adiciona um item à fila
    enqueue(item) {
        this.items.push(item);
        this.processQueue();
    }

    // Processa a fila
    async processQueue() {
        if (this.isProcessing) return; // Se já está processando, saia
        this.isProcessing = true;

        while (this.items.length > 0) {
            // Pegue os próximos itens para processar com base na concorrência
            const itemsToProcess = this.items.splice(0, this.concurrency);

            // Processa todos os itens selecionados em paralelo
            await Promise.all(itemsToProcess.map(item => this.processItem(item)));
        }

        this.isProcessing = false; // Finaliza o processamento
    }

    // Simulação do processamento de um item
    async processItem(item) {

    }
}

export const queue = new Queue(5);

function roundRoubin(array, index = 0) {
    return function () {
        if (index >= array.length) index = 0

        return array[index++]
    }
}

// Function to start child processes
function initializeCluster({ backgroundTaskFile, clusterSize, onMessage }) {
    const processes = new Map()
    for (let index = 0; index < clusterSize; index++) {

        const child = fork(backgroundTaskFile)
        child.on('exit', () => {
            // console.log(`process ${child.pid} exited`)
            processes.delete(child.pid)
        })

        child.on('error', error => {
            // console.log(`process ${child.pid} has an error`, error)
            process.exit(1)
        })

        child.on('message', (data) => {
            if (data.message !== 'item-done') return
            onMessage(data)
        })

        processes.set(child.pid, child)
    }

    return {
        getProcess: roundRoubin([...processes.values()]),
        killAll: () => {
            processes.forEach((child) => child.kill())
        }
    }

}

export function initialize({ backgroundTaskFile, clusterSize, onMessage }) {
    const { getProcess, killAll } = initializeCluster({ backgroundTaskFile, clusterSize, onMessage })
    // console.log(`starting with ${clusterSize} processes`)

    function sendToChild(message) {
        const child = getProcess()
        // send only if channel is open
        // if (child.killed) return;
        child.send(message)
    }


    return {
        sendToChild: sendToChild.bind(this),
        killAll: killAll.bind(this)
    }
}
