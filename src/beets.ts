import $ from 'jquery';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'datatables.net-responsive';
import Metronome from 'node-metronome';
import { getSnapShotVoteCounts } from '@brandonlehmann/exodia-data-harvester';
import numeral from 'numeral';
import { ethers } from '@brandonlehmann/ethers-providers';

$(document).ready(async () => {
    const provider = new ethers.providers.JsonRpcProvider('https://rpc.ftm.tools');
    const contract = new ethers.Contract('0xa3Cbd851460477C7b7aAA381da7ee4043462657F',
        '[{"inputs":[],"name":"EXOD","outputs":' +
        '[{"internalType":"contract IERC20","name":"","type":"address"}],' +
        '"stateMutability":"view","type":"function"},{"inputs":' +
        '[{"internalType":"address","name":"account","type":"address"}],' +
        '"name":"balanceOf","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"}],' +
        '"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":' +
        '[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},' +
        '{"inputs":[],"name":"sEXOD","outputs":[{"internalType":"contract IERC20","name":"",' +
        '"type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],' +
        '"name":"wsEXOD","outputs":[{"internalType":"contract wsIERC20","name":"","type":"address"}],' +
        '"stateMutability":"view","type":"function"}]')
        .connect(provider);

    const balanceOf = async (account: string): Promise<number> => {
        const decimals = await contract.decimals();
        const balance = await contract.balanceOf(account);
        if (balance.toNumber() < 1000) {
            return 0;
        }
        const fullBalance = balance.toNumber() / Math.pow(10, decimals);
        return (isNaN(fullBalance)) ? 0 : fullBalance;
    };

    const table = $('#beetsVoters').DataTable({
        order: [
            [1, 'desc'],
            [2, 'desc']
        ],
        columnDefs: [
            {
                targets: [1],
                render: function (data, type) {
                    if (type === 'display') {
                        data = numeral(data).format('0,0');
                    }
                    return data;
                }
            },
            {
                targets: [2],
                render: function (data, type) {
                    if (type === 'display') {
                        data = numeral(data).format('0,0.000000000');
                    }
                    return data;
                }
            }
        ],
        searching: false,
        info: false,
        paging: false
    }).columns.adjust().draw(false);

    const timer = new Metronome(120_000, true);

    timer.on('tick', async () => {
        try {
            timer.paused = true;

            const [voterRecords, rollCall] = await getSnapShotVoteCounts(
                '0xd00700ca5bf26078d979a55fbbb1f25651791afd1aff6f951422fa6903e3424c');

            let ourVotes = 0;
            let totalVotes = 0;

            for (const [, info] of rollCall) {
                if (info.poolName.toLowerCase().includes('monolith')) {
                    ourVotes = info.totalVotes;
                }
                totalVotes += info.totalVotes;
            }

            $('#voteInfo').text(
                numeral(ourVotes).format('0,0') + ' votes (' +
                numeral((ourVotes / totalVotes)).format('0,0.00%') + ')');

            table.clear();

            for (const [address, record] of voterRecords) {
                for (const vote of record.choices) {
                    if (vote.poolName?.toLowerCase().includes('monolith')) {
                        balanceOf(address)
                            .then(balance => {
                                table.row.add([
                                    address,
                                    vote.totalVotes,
                                    balance
                                ]).draw();
                            })
                            .catch(e => console.log(e.toString()));
                    }
                }
            }
        } catch (e: any) {
            console.log(e.toString());
        } finally {
            table.draw(false);
            timer.paused = false;
        }
    });

    timer.tick();
});
