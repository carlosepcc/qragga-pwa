/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { Trash2, Star, Search, Download, Upload, Eye, RefreshCw, Clipboard, ExternalLink, Calendar, Check, AlertCircle } from 'lucide-react';
import { BARCODE_DEFINITIONS } from '../data/barcodes';

interface HistoryTabProps {
  history: HistoryItem[];
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
  onSelectRecall: (value: string, format: string) => void;
  onImportBackup: (imported: HistoryItem[]) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  onToggleFavorite,
  onDeleteItem,
  onClearHistory,
  onSelectRecall,
  onImportBackup,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'scanned' | 'created' | 'favorites'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | '1D' | '2D'>('all');
  
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string>('');
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const isUrl = (str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const getFormatName = (fmt: string) => {
    const d = BARCODE_DEFINITIONS.find(def => def.id === fmt);
    return d ? d.name : fmt.toUpperCase();
  };

  // Filter logic
  const filteredHistory = history.filter(item => {
    // Search query matches text or label or format name
    const query = searchQuery.toLowerCase();
    const matchSearch = 
      item.value.toLowerCase().includes(query) || 
      (item.label && item.label.toLowerCase().includes(query)) ||
      getFormatName(item.format).toLowerCase().includes(query);

    // FilterType Match
    const matchType = 
      filterType === 'all' ||
      (filterType === 'scanned' && item.type === 'scanned') ||
      (filterType === 'created' && item.type === 'created') ||
      (filterType === 'favorites' && item.isFavorite);

    // FilterCategory Match
    const def = BARCODE_DEFINITIONS.find(d => d.id === item.format);
    const matchCategory = 
      filterCategory === 'all' ||
      (filterCategory === '1D' && def?.category === '1D') ||
      (filterCategory === '2D' && def?.category === '2D');

    return matchSearch && matchType && matchCategory;
  });

  // Export database to offline backup file (JSON)
  const handleExportBackup = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `qragga-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Import database from offline backup file (JSON)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            // Basic schema validation
            const isValid = parsed.every(item => item.id && item.value && item.format);
            if (isValid) {
              onImportBackup(parsed);
              alert(`Successfully imported ${parsed.length} items to database!`);
            } else {
              alert('Error: Backup file format is invalid.');
            }
          } else {
            alert('Error: Backup file must contain a JSON array list.');
          }
        } catch (err) {
          alert('Error: Failed to parse backup file JSON.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div id="history-container" className="w-full max-w-6xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-background)]">
            History & Database
          </h2>
          <p className="text-sm opacity-80 text-[var(--md-sys-color-on-background)]">
            Manage your offline scanned and customized barcode records, export JSON backups, and perform search recalls.
          </p>
        </div>

        {/* Database backup actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportBackup}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-40"
            style={{
              color: 'var(--md-sys-color-primary, #6750A4)',
              borderColor: 'var(--md-sys-color-primary, #6750A4)',
            }}
          >
            <Download size={14} />
            <span>Backup Export</span>
          </button>

          <label className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition"
            style={{
              color: 'var(--md-sys-color-secondary, #625B71)',
              borderColor: 'var(--md-sys-color-secondary, #625B71)',
            }}
          >
            <Upload size={14} />
            <span>Restore Import</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportBackup}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: FILTERS & RECORDS LIST (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Filtering Card */}
          <div className="p-4 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
              borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
            }}
          >
            {/* Search Input */}
            <div className="relative flex-grow md:max-w-xs">
              <Search className="absolute left-3 top-2.5 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder="Search value or label..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-2xl text-xs bg-white dark:bg-zinc-900 border outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
                style={{
                  borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
                  color: 'var(--md-sys-color-on-surface, #1D1B20)',
                }}
              />
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {['all', 'scanned', 'created', 'favorites'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-all ${filterType === t ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] border-[var(--md-sys-color-primary)]' : 'bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Category Select Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="px-3 py-2 rounded-2xl text-xs bg-white dark:bg-zinc-900 border font-medium outline-none"
              style={{
                borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
                color: 'var(--md-sys-color-on-surface, #1D1B20)',
              }}
            >
              <option value="all">All Specs</option>
              <option value="1D">1D Barcodes</option>
              <option value="2D">2D Codes</option>
            </select>
          </div>

          {/* History List */}
          <div className="flex flex-col gap-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-3xl border flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all duration-300 ${selectedItem?.id === item.id ? 'ring-2 ring-[var(--md-sys-color-primary)]' : ''}`}
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container-lowest, #FFFFFF)',
                    borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
                  }}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Color Tag indicating Scanned vs Created */}
                    <div className="w-1.5 h-12 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: item.type === 'scanned' 
                          ? 'var(--md-sys-color-tertiary, #7D5260)' 
                          : 'var(--md-sys-color-primary, #6750A4)'
                      }}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[var(--md-sys-color-primary)]">
                          {getFormatName(item.format)}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: item.type === 'scanned' ? '#FFE3EC' : '#E8DEF8',
                            color: item.type === 'scanned' ? '#31111D' : '#21005D',
                          }}
                        >
                          {item.type}
                        </span>
                        {item.label && (
                          <span className="text-xs opacity-70 truncate font-semibold">
                            • {item.label}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-mono truncate max-w-sm text-[var(--md-sys-color-on-surface)] mt-1">
                        {item.value}
                      </p>

                      <span className="text-[10px] opacity-65 flex items-center gap-1 mt-0.5">
                        <Calendar size={10} />
                        {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions right side */}
                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleFavorite(item.id)}
                      className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition"
                      style={{
                        color: item.isFavorite ? '#E0A800' : 'var(--md-sys-color-outline, #79747E)'
                      }}
                    >
                      <Star size={16} fill={item.isFavorite ? '#E0A800' : 'none'} />
                    </button>

                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-zinc-300">
                <p className="text-sm opacity-60 text-[var(--md-sys-color-on-background)]">
                  No matching records found.
                </p>
              </div>
            )}
          </div>

          {/* Database management bottom bar */}
          {history.length > 0 && (
            <div className="flex justify-between items-center px-2">
              <span className="text-xs font-semibold opacity-65">
                Total offline records: {history.length}
              </span>

              {showConfirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                    <AlertCircle size={12} /> Confirm delete?
                  </span>
                  <button
                    onClick={() => {
                      onClearHistory();
                      setShowConfirmClear(false);
                      setSelectedItem(null);
                    }}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow hover:bg-red-700 transition"
                  >
                    Yes, Clear All
                  </button>
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="px-3 py-1 rounded-full text-xs font-semibold border hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirmClear(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-red-600 hover:bg-red-50 transition"
                >
                  <Trash2 size={13} />
                  <span>Purge Offline DB</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: RECORD DETAIL RECALL BOARD (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-6">
          <div className="p-6 rounded-3xl border flex flex-col gap-4 shadow-sm"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
              borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
            }}
          >
            <h3 className="text-lg font-bold tracking-tight text-[var(--md-sys-color-on-surface)] mb-2">
              Record Detail Panel
            </h3>

            {selectedItem ? (
              <div className="flex flex-col gap-4">
                
                {/* Details list */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                      Barcode Standard
                    </span>
                    <span className="text-sm font-semibold">
                      {getFormatName(selectedItem.format)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                      Decoded String Content
                    </span>
                    <div className="bg-white dark:bg-zinc-900 border p-3 rounded-xl font-mono text-xs break-all max-h-36 overflow-y-auto">
                      {selectedItem.value}
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                      Date Recorded
                    </span>
                    <span className="text-xs">
                      {new Date(selectedItem.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Recall & Action Buttons */}
                <div className="flex flex-col gap-2 pt-4 border-t border-dashed" style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}>
                  
                  <button
                    onClick={() => handleCopy(selectedItem.value, selectedItem.id)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5 transition"
                    style={{
                      color: 'var(--md-sys-color-primary, #6750A4)',
                      borderColor: 'var(--md-sys-color-primary, #6750A4)',
                    }}
                  >
                    {copiedId === selectedItem.id ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Clipboard size={14} />
                        <span>Copy Text Content</span>
                      </>
                    )}
                  </button>

                  {isUrl(selectedItem.value) && (
                    <a
                      href={selectedItem.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-xs font-semibold text-white text-center hover:opacity-90 shadow-sm transition"
                      style={{
                        backgroundColor: 'var(--md-sys-color-secondary, #625B71)',
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>Open URL Link</span>
                    </a>
                  )}

                  <button
                    onClick={() => onSelectRecall(selectedItem.value, selectedItem.format)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-xs font-semibold text-white hover:opacity-90 transition shadow-md"
                    style={{
                      backgroundColor: 'var(--md-sys-color-primary, #6750A4)',
                    }}
                  >
                    <RefreshCw size={14} />
                    <span>Recall into Creator Editor</span>
                  </button>

                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12">
                <p className="text-xs opacity-60 text-[var(--md-sys-color-on-surface)] leading-relaxed">
                  Select any database record on the left to inspect detailed values, copy raw content, open URLs, or load details back into the barcode card creator.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
