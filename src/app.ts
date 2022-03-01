import $ from 'jquery';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Metronome from 'node-metronome';
import {
    BeetsPool,
    getBEETsPoolData,
    getDAOData,
    IBeetsPoolData,
    IDAOData,
    getBlockTiming,
    getBondsInformation,
    IBondInformation
} from '@brandonlehmann/exodia-data-harvester';
import numeral from 'numeral';
import fetch from 'cross-fetch';

const fetch_price = async (symbol: string | number): Promise<number> => {
    return (await fetch('https://cmc-fetch.turtlecoin.workers.dev/?symbol=' + symbol.toString())).json();
};

const compoundRate = (rate: number, days = 1, epochsPerDay = 1): number => {
    return Math.pow(1 + rate, epochsPerDay * days) - 1;
};

const calculateRebaseRate = async (dao: IDAOData): Promise<[number, number]> => {
    const bpsData = await getBlockTiming();

    const bps = bpsData.blocksPerSecond;

    const blocksPerDay = bps * 86_400;

    const epochsPerDay = blocksPerDay / dao.epochLength.toJSNumber();

    const rebaseRate = (dao.epochDistribute.toJSNumber() / dao.stakedCirculatingSupply.toJSNumber());

    return [compoundRate(rebaseRate, 1, epochsPerDay), compoundRate(rebaseRate, 365, epochsPerDay)];
};

$(document).ready(() => {
    const timer = new Metronome(15_000, true);

    let beets: IBeetsPoolData;
    let staking: IDAOData;
    let bonds: IBondInformation[];

    const getBond = (contract: string): IBondInformation => bonds.filter(elem => elem.bond === contract)[0];

    const updateDisplay = async () => {
        const investment = parseFloat(($('#totalInvestment').val() as number).toString().replace(',', ''));
        const split = numeral(investment / 5).format('0,0.00');

        $('#EXOD').val(split);
        $('#wsEXOD').val(split);
        $('#gOHM').val(split);
        $('#MAI').val(split);
        $('#wFTM').val(split);

        let monoTotal = 0;
        let stakingTotal = 0;

        if (beets) {
            const swapApr = parseFloat(beets.apr.swapApr) * 100;
            const rewardsApr = parseFloat(beets.apr.beetsApr) * 100;
            const dailySwapApr = swapApr / 365;
            const dailyRewardsApr = rewardsApr / 365;

            $('#BEETsFeesAPR').val(numeral(swapApr).format('0,0.000000'));
            $('#BEETsRewardAPR').val(numeral(rewardsApr).format('0,0.000000'));
            $('#BEETsFeesDaily').val(numeral(dailySwapApr).format('0,0.000000'));
            $('#BEETsRewardDaily').val(numeral(dailyRewardsApr).format('0,0.000000'));

            const monoDailyFees = (investment * dailySwapApr) / 100;
            const monoDailyReward = (investment * dailyRewardsApr) / 100;

            monoTotal += monoDailyFees + monoDailyReward;

            $('#monoPoolFees').val(numeral(monoDailyFees).format('0,0.00'));
            $('#monoBEETsReward').val(numeral(monoDailyReward).format('0,0.00'));
        }

        if (staking) {
            const [dailyRebaseRate, yearlyRebaseRate] = await calculateRebaseRate(staking);
            $('#YearlyRewardYield').val(numeral(yearlyRebaseRate * 100).format('0,0.000000'));
            $('#DailyRewardYield').val(numeral(dailyRebaseRate * 100).format('0,0.000000'));

            const monowsEXODRebase = ((investment / 5) * dailyRebaseRate);

            monoTotal += monowsEXODRebase;

            const monoEXODDilution = -((investment / 5) * dailyRebaseRate);

            monoTotal += monoEXODDilution;

            const stakingwsEXODRebase = (investment * dailyRebaseRate);

            stakingTotal += stakingwsEXODRebase;

            $('#monoEXOD').val(numeral(monoEXODDilution).format('0,0.00'));
            $('#monowsEXOD').val(numeral(monowsEXODRebase).format('0,0.00'));
            $('#stakingwsEXOD').val(numeral(stakingTotal).format('0,0.00'));
            $('#stakingEXOD').val(numeral(0).format('0,0.00'));
            $('#stakingPoolFees').val(numeral(0).format('0,0.00'));
            $('#stakingBEETsReward').val(numeral(0).format('0,0.00'));
        }

        if (monoTotal > stakingTotal) {
            $('#monoTotal').addClass('pulse');
            $('#stakingTotal').removeClass('pulse');
        } else {
            $('#monoTotal').removeClass('pulse');
            $('#stakingTotal').addClass('pulse');
        }

        $('#monoTotal').val(numeral(monoTotal).format('0,0.00'));
        $('#stakingTotal').val(numeral(stakingTotal).format('0,0.00'));
        $('#monoPS').val(numeral(monoTotal / 86_400).format('0,0.0000'));
        $('#stakingPS').val(numeral(stakingTotal / 86_400).format('0,0.0000'));

        let exod_price = 0;
        try {
            exod_price = await fetch_price('exod');
            $('#EXODPrice').val(numeral(exod_price).format('0,0.00'));
        } catch {}

        try {
            const bond = getBond('0xC43Db16Ed7b57597170b76D3afF29708bc608483');
            $('#DAI').val(numeral(bond.bondPriceInUSD).format('0,0.00') +
                ' (' + numeral(1 - (bond.bondPriceInUSD / exod_price)).format('0,0.00%') + ')');
        } catch {}

        try {
            const bond = getBond('0xcf69Ba319fF0F8e2481dE13d16CE7f74b063533E');
            $('#gOHMBond').val(numeral(bond.bondPriceInUSD).format('0,0.00') +
                ' (' + numeral(1 - (bond.bondPriceInUSD / exod_price)).format('0,0.00%') + ')');
        } catch {}

        try {
            const bond = getBond('0x18c01a517ED7216b52A4160c12bf814210477Ef2');
            $('#Monolith').val(numeral(bond.bondPriceInUSD).format('0,0.00') +
                ' (' + numeral(1 - (bond.bondPriceInUSD / exod_price)).format('0,0.00%') + ')');
        } catch {}

        try {
            const bond = getBond('0xe2eA15E992455972Ae11De0a543C48DbeAb9E5Ce');
            $('#fBEETs').val(numeral(bond.bondPriceInUSD).format('0,0.00') +
                ' (' + numeral(1 - (bond.bondPriceInUSD / exod_price)).format('0,0.00%') + ')');
        } catch {}

        try {
            const bond = getBond('0x39086c3E5979d6F0aB0a54e3135D6e3eDD53c395');
            $('#wFTMBond').val(numeral(bond.bondPriceInUSD).format('0,0.00') +
                ' (' + numeral(1 - (bond.bondPriceInUSD / exod_price)).format('0,0.00%') + ')');
        } catch {}
    };

    $('#totalInvestment').on('keyup', () => {
        updateDisplay();
    });

    timer.on('tick', async () => {
        beets = await getBEETsPoolData(BeetsPool.MONOLITH);
        staking = await getDAOData();
        bonds = await getBondsInformation()
            .catch((e: any) => {
                console.log(e.toString());
                return [];
            });

        updateDisplay();
    });

    timer.tick();
});
