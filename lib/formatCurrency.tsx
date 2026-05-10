export const formatCurrency = (value: number) =>
    value.toLocaleString("fr-FR", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
    });