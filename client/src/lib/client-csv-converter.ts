import { InsertClient } from "@shared/schema";

export interface ClientCSVRow {
  client_number: string;
  first_name: string;
  [key: string]: string;
}

export function convertCSVToClients(csvData: ClientCSVRow[]): InsertClient[] {
  return csvData.map((row) => {
    // Create client object from CSV row
    return {
      clientNumber: row.client_number,
      firstName: row.first_name,
      // Use first_name as the name
      name: row.first_name,
      // Default to only Risk Tolerance
      availableSections: ["riskTolerance"],
    };
  });
}

// Template for client CSV
export function getClientCSVTemplate(): string {
  return "client_number,first_name\n" +
         "1234567,John\n" +
         "2345678,Jane";
}