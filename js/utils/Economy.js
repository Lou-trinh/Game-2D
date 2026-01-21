export const Economy = {
    getCoins: () => {
        const val = localStorage.getItem('total_coins');
        return val ? parseInt(val) : 0;
    },
    saveCoins: (amount) => {
        localStorage.setItem('total_coins', amount.toString());
    },
    addCoins: (amount) => {
        const current = Economy.getCoins();
        Economy.saveCoins(current + amount);
    },
    getDiamonds: () => {
        const val = localStorage.getItem('total_diamonds');
        return val ? parseInt(val) : 0;
    },
    saveDiamonds: (amount) => {
        localStorage.setItem('total_diamonds', amount.toString());
    },
    addDiamonds: (amount) => {
        const current = Economy.getDiamonds();
        Economy.saveDiamonds(current + amount);
    }
};
