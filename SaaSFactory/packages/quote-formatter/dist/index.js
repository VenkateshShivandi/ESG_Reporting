"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  formatQuote: () => formatQuote,
  generateQuoteTable: () => generateQuoteTable
});
module.exports = __toCommonJS(src_exports);

// src/formatter.ts
var generateQuoteTable = (data, options) => {
  var _a;
  const headers = ["Item", "Quantity", "Unit Price", "Total"];
  const rows = data.items.map((item) => [
    item.name,
    item.quantity.toString(),
    `$${item.unit_price.toFixed(2)}`,
    `$${item.total.toFixed(2)}`
  ]);
  const tableHtml = `
    <table class="${((_a = options == null ? void 0 : options.customStyles) == null ? void 0 : _a.table) || ""}">
      <thead>
        <tr>
          ${headers.map((h) => {
    var _a2;
    return `<th class="${((_a2 = options == null ? void 0 : options.customStyles) == null ? void 0 : _a2.header) || ""}">${h}</th>`;
  }).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => {
    var _a2;
    return `
          <tr class="${((_a2 = options == null ? void 0 : options.customStyles) == null ? void 0 : _a2.row) || ""}">
            ${row.map((cell) => {
      var _a3;
      return `<td class="${((_a3 = options == null ? void 0 : options.customStyles) == null ? void 0 : _a3.cell) || ""}">${cell}</td>`;
    }).join("")}
          </tr>
        `;
  }).join("")}
      </tbody>
    </table>
  `;
  return tableHtml;
};

// src/plugin.ts
var formatQuote = (data) => {
  const formattedData = generateQuoteTable(data);
  return __spreadProps(__spreadValues({}, JSON.parse(formattedData)), {
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatQuote,
  generateQuoteTable
});
