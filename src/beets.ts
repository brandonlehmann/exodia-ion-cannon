import $ from 'jquery';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'datatables.net-responsive';
import 'datatables.net-fixedheader';
import Metronome from 'node-metronome';
import { getSnapShotVoteCounts } from '@brandonlehmann/exodia-data-harvester';
import numeral from 'numeral';
import { ethers } from '@brandonlehmann/ethers-providers';
import fetch from 'cross-fetch';

const fetch_price = async (symbol: string | number): Promise<number> => {
    return (await fetch('https://cmc-fetch.turtlecoin.workers.dev/?symbol=' + symbol.toString())).json();
};

const getfBEETsPrice = async (fixed = true): Promise<number> => {
    if (fixed) {
        const beets = 0.6879; // await fetch_price('beets');
        const ftm = 1.3089; // await fetch_price('ftm');

        const bpt = (0.74 * beets) + (0.12 * ftm);

        return (bpt * 1.0145);
    } else {
        const beets = await fetch_price('beets');
        const ftm = await fetch_price('ftm');

        const bpt = (0.78 * beets) + (0.1 * ftm);

        return (bpt * 1.0152);
    }
};

const getQueryStringParam = <T>(key: string): T | undefined => {
    const queryString = window.location.search.substring(1);
    const params = queryString.split('&');
    for (let i = 0; i < params.length; i++) {
        const param = params[i].split('=');
        if (param[0] === key) {
            return (param[1] as any);
        }
    }
};

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
        language: {
            emptyTable: 'Please wait while data is loaded...'
        },
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
                        data = numeral(data).format('0,0.00000000%');
                    }
                    return data;
                }
            },
            {
                targets: [4, 6],
                render: function (data, type) {
                    if (type === 'display') {
                        data = numeral(data).format('0,0.0000');
                    }
                    return data;
                }
            },
            {
                targets: [3, 5],
                render: function (data, type) {
                    if (type === 'display') {
                        data = numeral(data).format('0,0.00');
                    }
                    return data;
                }
            },
            {
                targets: [0],
                className: 'fixed-width-font'
            },
            {
                targets: [1, 2, 3, 4, 5],
                className: 'dt-right'
            },
            {
                targets: [6],
                className: 'dt-center'
            }
        ],
        searching: false,
        info: false,
        paging: false,
        responsive: true,
        fixedHeader: true
    }).columns.adjust().draw(false);

    const timer = new Metronome(120_000, true);

    timer.on('tick', async () => {
        try {
            timer.paused = true;

            const proposal = getQueryStringParam<string>('proposal') ||
                '0xd00700ca5bf26078d979a55fbbb1f25651791afd1aff6f951422fa6903e3424c';

            let fbeets_price = 0;
            let exod_price = 0;
            if (proposal === '0xd00700ca5bf26078d979a55fbbb1f25651791afd1aff6f951422fa6903e3424c') {
                fbeets_price = await getfBEETsPrice();
                exod_price = 153.18;
            } else {
                fbeets_price = await getfBEETsPrice(false);
                exod_price = await fetch_price('exod');
            }

            const [voterRecords, rollCall, voteTitle] = await getSnapShotVoteCounts(proposal);

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

            $('#voteTitle').text(voteTitle);

            table.clear();

            for (const [address, record] of voterRecords) {
                for (const vote of record.choices) {
                    if (vote.poolName?.toLowerCase().includes('monolith')) {
                        balanceOf(address)
                            .then(balance => {
                                const beetsValue = vote.totalVotes * fbeets_price;
                                const exodValue = balance * exod_price;

                                if (proposal === '0xd00700ca5bf26078d979a55fbbb1f25651791afd1aff6f951422fa6903e3424c') {
                                    const beetsRequiredValue = (beetsValue / exod_price) * 0.04;
                                    const requiredBalance = Math.max(beetsRequiredValue, 0.33);

                                    const qualified = (balance >= requiredBalance) &&
                                        vote.totalVotes > 0;

                                    table.row.add([
                                        address,
                                        vote.totalVotes,
                                        vote.totalVotes / ourVotes,
                                        beetsValue,
                                        balance,
                                        exodValue,
                                        requiredBalance,
                                        (qualified) ? 'Yes' : 'No'
                                    ]).draw();
                                } else {
                                    table.row.add([
                                        address,
                                        vote.totalVotes,
                                        vote.totalVotes / ourVotes,
                                        beetsValue,
                                        balance,
                                        exodValue,
                                        'N/A',
                                        'N/A'
                                    ]);
                                }
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
