// src/utils/invoiceUtils.ts
export const getInvoiceType = (type: string): string => {
  console.log(type);
  switch (type) {
    case "10":
      return "增值普通发票";
    case "04":
      return "普通发票";
    case "32":
      return "普通发票";
    case "01":
      return "增值专用发票";
    default:
      return "未知类型";
  }
};
