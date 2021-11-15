import parse from "csv-parse";
import fs from "fs";
import {BigNumber, constants, utils} from 'ethers'

const input='./unreleased-token.csv';
const output='./unreleased-token.json';
let data = {}

/**
 * Parse the unreleased token CSV. 
 * The amount of unrelased token outside intervals is 0
 */
fs.createReadStream(input)
    .pipe(parse({
        delimiter: ',',
        columns: true
    }))
    .on('data', function(csvrow) {
        try {
            const address = `0${csvrow.account.slice(1)}`
            const allocation = {
                lowerBlock: Number(csvrow.lower_block),  
                upperBlock: Number(csvrow.upper_block), 
                unreleased: utils.parseEther(csvrow.unreleased).toString()
            }
            if (!data[address]) {
                const entry = Object.fromEntries([[address, [allocation]]])
                Object.assign(data, entry)
            } else {
                // if this allocation can be combined existing ones
                const index = data[address].findIndex(alloc => alloc.upperBlock === allocation.lowerBlock && BigNumber.from(alloc.unreleased).eq(BigNumber.from(allocation.unreleased)))
                if (index > -1) {
                    data[address][index].upperBlock = allocation.upperBlock
                } else {
                    data[address].push(allocation)
                }
            }
        } catch (error) {
            console.error(error)
        }
    })
    .on('end',function() {
        Object.keys(data).forEach(address => {
            // clean up the open-ended interval
            data[address] = data[address].filter(alloc => !(alloc.upperBlock === 0 && BigNumber.from(alloc.unreleased).eq(constants.Zero)))
        })
        console.log(data);
        fs.writeFileSync(output, JSON.stringify(data, null ,2))
    });
