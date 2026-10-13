/**
 * GST Calculation Engine for BillFlow
 * Supports Intra-State (CGST + SGST) and Inter-State (IGST) calculations.
 */

export const roundTo = (num, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(num) + Number.EPSILON) * factor) / factor;
};

export const calculateInvoiceTotals = ({
  items = [],
  isInterState = false,
  overallDiscount = 0,
  overallDiscountType = 'fixed', // 'fixed' | 'percentage'
  shipping = 0,
  paidAmount = 0,
}) => {
  let subtotal = 0;
  let totalItemDiscounts = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const processedItems = items.map((item) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    const lineBase = roundTo(qty * rate);
    subtotal += lineBase;

    // Line discount
    let lineDiscount = 0;
    const discountVal = Math.max(0, Number(item.discount) || 0);
    // If discount <= 100 and discountType is percentage or implied %, calculate %
    if (item.discountType === 'fixed') {
      lineDiscount = Math.min(lineBase, discountVal);
    } else {
      lineDiscount = roundTo((lineBase * Math.min(100, discountVal)) / 100);
    }
    totalItemDiscounts += lineDiscount;

    const taxableAmount = Math.max(0, roundTo(lineBase - lineDiscount));
    totalTaxable += taxableAmount;

    const gstRate = Math.max(0, Number(item.gstRate) || 0);
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = roundTo((taxableAmount * gstRate) / 100);
      totalIgst += igst;
    } else {
      const halfRate = gstRate / 2;
      cgst = roundTo((taxableAmount * halfRate) / 100);
      sgst = roundTo((taxableAmount * halfRate) / 100);
      totalCgst += cgst;
      totalSgst += sgst;
    }

    const itemTotal = roundTo(taxableAmount + (isInterState ? igst : cgst + sgst));

    // Build clean item object — strip empty/invalid productId to prevent BSONError
    const cleanItem = {
      name: item.name || '',
      sku: item.sku || '',
      description: item.description || '',
      hsnSac: item.hsnSac || '',
      quantity: qty,
      unit: item.unit || 'PCS',
      rate,
      discount: discountVal,
      discountType: item.discountType || 'percentage',
      discountAmount: lineDiscount,
      taxableAmount,
      gstRate,
      cgst,
      sgst,
      igst,
      amount: itemTotal,
    };

    // Only include productId if it's a valid non-empty string (valid ObjectId format)
    if (item.productId && String(item.productId).match(/^[0-9a-fA-F]{24}$/)) {
      cleanItem.productId = item.productId;
    }

    return cleanItem;
  });

  // Calculate overall invoice-level discount
  let finalOverallDiscount = 0;
  const numOverallDiscount = Math.max(0, Number(overallDiscount) || 0);
  if (overallDiscountType === 'percentage') {
    finalOverallDiscount = roundTo((totalTaxable * Math.min(100, numOverallDiscount)) / 100);
  } else {
    finalOverallDiscount = Math.min(totalTaxable, numOverallDiscount);
  }

  const finalTaxable = Math.max(0, roundTo(totalTaxable - finalOverallDiscount));
  const shippingVal = Math.max(0, Number(shipping) || 0);

  // If there's an overall discount, proportion tax reduction
  let finalCgst = totalCgst;
  let finalSgst = totalSgst;
  let finalIgst = totalIgst;

  if (totalTaxable > 0 && finalOverallDiscount > 0) {
    const ratio = finalTaxable / totalTaxable;
    finalCgst = roundTo(totalCgst * ratio);
    finalSgst = roundTo(totalSgst * ratio);
    finalIgst = roundTo(totalIgst * ratio);
  }

  const rawTotal = roundTo(
    finalTaxable + (isInterState ? finalIgst : finalCgst + finalSgst) + shippingVal
  );

  const roundedTotal = Math.round(rawTotal);
  const roundOff = roundTo(roundedTotal - rawTotal);
  const grandTotal = roundedTotal;

  const validPaidAmount = Math.max(0, Number(paidAmount) || 0);
  const balanceAmount = Math.max(0, roundTo(grandTotal - validPaidAmount));

  let status = 'Pending';
  if (validPaidAmount >= grandTotal && grandTotal > 0) {
    status = 'Paid';
  } else if (validPaidAmount > 0) {
    status = 'Partially Paid';
  }

  return {
    items: processedItems,
    subtotal: roundTo(subtotal),
    discount: finalOverallDiscount + totalItemDiscounts,
    overallDiscount: finalOverallDiscount,
    overallDiscountType,
    taxableAmount: finalTaxable,
    cgst: isInterState ? 0 : finalCgst,
    sgst: isInterState ? 0 : finalSgst,
    igst: isInterState ? finalIgst : 0,
    shipping: shippingVal,
    roundOff,
    total: grandTotal,
    paidAmount: validPaidAmount,
    balanceAmount,
    status,
  };
};
