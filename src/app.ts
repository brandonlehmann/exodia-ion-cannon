import $ from 'jquery';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Metronome from 'node-metronome';
import { getBEETsPoolData, getDAOData, IBeetsPoolData, IDAOData } from '@brandonlehmann/exodia-monolith-comparison';
import numeral from 'numeral';

const compoundRate = (rate: number, days = 1, epochsPerDay = 1): number => {
    return Math.pow(1 + rate, epochsPerDay * days) - 1;
};

const calculateRebaseRate = (dao: IDAOData): [number, number] => {
    const bps = dao.blockAverage.toJSNumber() / Math.pow(10, dao.blockPrecision);

    const blocksPerDay = bps * 86_400;

    const epochsPerDay = blocksPerDay / dao.epochLength.toJSNumber();

    const rebaseRate = (dao.epochDistribute.toJSNumber() / dao.stakedCirculatingSupply.toJSNumber());

    return [compoundRate(rebaseRate, 1, epochsPerDay), compoundRate(rebaseRate, 365, epochsPerDay)];
};

$(document).ready(() => {
    const timer = new Metronome(15_000, true);

    let beets: IBeetsPoolData;
    let staking: IDAOData;

    const updateDisplay = () => {
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
            const [dailyRebaseRate, yearlyRebaseRate] = calculateRebaseRate(staking);
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
    };

    $('#totalInvestment').on('keyup', () => {
        updateDisplay();
    });

    timer.on('tick', async () => {
        beets = await getBEETsPoolData();
        staking = await getDAOData();

        updateDisplay();
    });

    timer.tick();
});
