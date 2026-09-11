/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BarcodeDefinition } from '../types';

export const BARCODE_DEFINITIONS: BarcodeDefinition[] = [
  // 2D Codes
  {
    id: 'qrcode',
    name: 'QR Code',
    category: '2D',
    description: 'The standard multi-purpose matrix barcode. Stores URLs, contacts, text, Wi-Fi configuration, etc.',
    placeholder: 'https://example.com'
  },
  {
    id: 'azteccode',
    name: 'Aztec Code',
    category: '2D',
    description: 'Niche square matrix code with central bullseye finder. Ideal for compact areas like transit tickets, boarding passes, and rail documents.',
    placeholder: 'AZTEC-BOARDING-PASS-90210'
  },
  {
    id: 'datamatrix',
    name: 'Data Matrix',
    category: '2D',
    description: 'High-density 2D layout. Highly readable even at small physical sizes or under low contrast. Heavily used in electronics, medicine, and aerospace.',
    placeholder: 'SER-A10984-Z920'
  },
  {
    id: 'pdf417',
    name: 'PDF417 Code',
    category: '2D',
    description: 'Stacked linear barcode format. Highly secure, capable of storing massive amounts of data. Standard for driver licenses, national IDs, and shipping labels.',
    placeholder: 'DL-9302-CARLOS-CARDENAS'
  },
  
  // 1D Codes
  {
    id: 'code128',
    name: 'Code 128',
    category: '1D',
    description: 'High-density linear barcode. Supports all 128 characters of ASCII, making it the default for logistics, product inventory, and shipping containers.',
    placeholder: 'ZEBRA-128-9843-02'
  },
  {
    id: 'code39',
    name: 'Code 39',
    category: '1D',
    description: 'Alphanumeric barcode with variable length. Simple and self-checking. Widely used in automotive inventory, defense, and manufacturing.',
    placeholder: 'PROD-39-MARK-1'
  },
  {
    id: 'ean13',
    name: 'EAN-13',
    category: '1D',
    description: '13-digit European Article Number, worldwide standard for identifying retail products on retail shelf scans.',
    placeholder: '4012345678901',
    validationRegex: /^\d{13}$/
  },
  {
    id: 'ean8',
    name: 'EAN-8',
    category: '1D',
    description: '8-digit compact version of EAN, designed for small-sized packaging (like chewing gum, cosmetics, or single candy bars).',
    placeholder: '12345670',
    validationRegex: /^\d{8}$/
  },
  {
    id: 'upca',
    name: 'UPC-A',
    category: '1D',
    description: '12-digit Universal Product Code, standard barcode format for consumer package tracking in supermarkets and stores across the USA & Canada.',
    placeholder: '012345678905',
    validationRegex: /^\d{12}$/
  },
  {
    id: 'codabar',
    name: 'Codabar',
    category: '1D',
    description: 'Numeric barcode that includes start/stop characters (A, B, C, D). Robust offline scan, used in library book cards, blood banks, and FedEx shipping slips.',
    placeholder: 'A12345678B',
    validationRegex: /^[A-Da-d][0-9\-$.:+/]*[A-Da-d]$/
  },
  {
    id: 'itf',
    name: 'Interleaved 2 of 5 (ITF)',
    category: '1D',
    description: 'Numeric-only barcode. Characters are encoded in pairs, so the input string length must be an even number. Heavy carton-label standard.',
    placeholder: '123456789012',
    validationRegex: /^\d+$/
  }
];

export function getDefinition(id: string): BarcodeDefinition | undefined {
  return BARCODE_DEFINITIONS.find(def => def.id === id);
}
