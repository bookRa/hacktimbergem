import { useState } from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Search, 
  Triangle, 
  Square, 
  Calendar, 
  StickyNote, 
  Home, 
  Component, 
  Copy,
  AlertTriangle
} from 'lucide-react';
import { Input } from './ui/input';
import { NeedsAttentionRow } from './NeedsAttentionRow';

export function RightPanel() {
  const [activeTab, setActiveTab] = useState('explorer');

  const explorerItems = [
    { icon: Triangle, name: 'Drawing_001', type: 'Drawing', id: 'DWG001' },
    { icon: Square, name: 'Symbol_Header', type: 'Symbol Instance', id: 'SYM001', incomplete: true },
    { icon: Calendar, name: 'Schedule_Q1', type: 'Schedule', id: 'SCH001' },
    { icon: StickyNote, name: 'Note_Review', type: 'Note', id: 'NOT001' },
    { icon: Home, name: 'Space_MainFloor', type: 'Space', id: 'SPC001' },
    { icon: Component, name: 'Scope_Electrical', type: 'Scope', id: 'SCP001', incomplete: true },
  ];

  const needsAttentionItems = [
    { 
      icon: Triangle, 
      name: 'Symbol_Header', 
      issue: 'Missing definition',
      actions: ['Pick definition', 'Create from OCR']
    },
    { 
      icon: Component, 
      name: 'Scope_Electrical', 
      issue: 'Missing drawing link',
      actions: ['Pick drawing', 'Create scope from OCR']
    },
  ];

  return (
    <div 
      className="w-[360px] border-l flex flex-col"
      style={{ 
        backgroundColor: 'var(--timbergem-panel)',
        borderColor: 'var(--timbergem-border)'
      }}
    >
      {/* Explorer Section */}
      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="p-4 pb-0">
            <TabsList 
              className="grid w-full grid-cols-2"
              style={{ backgroundColor: 'var(--timbergem-panel-elevated)' }}
            >
              <TabsTrigger 
                value="explorer"
                className="data-[state=active]:bg-[var(--timbergem-accent)] data-[state=active]:text-[var(--timbergem-accent-contrast)]"
              >
                Explorer
              </TabsTrigger>
              <TabsTrigger 
                value="attention"
                className="data-[state=active]:bg-[var(--timbergem-accent)] data-[state=active]:text-[var(--timbergem-accent-contrast)]"
              >
                Needs Attention
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="explorer" className="flex-1 px-4 pb-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--timbergem-muted)' }} />
                <Input 
                  placeholder="Search entities..."
                  className="pl-9"
                  style={{
                    backgroundColor: 'var(--timbergem-panel-elevated)',
                    borderColor: 'var(--timbergem-border)'
                  }}
                />
              </div>

              <ScrollArea className="h-80">
                <div className="space-y-1">
                  {explorerItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-[var(--timbergem-panel-elevated)] transition-colors"
                      >
                        <Icon 
                          className="h-4 w-4 flex-shrink-0" 
                          style={{ 
                            color: item.incomplete ? 'var(--timbergem-warn)' : 'var(--timbergem-muted)' 
                          }} 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="body truncate">{item.name}</div>
                          <div 
                            className="caption" 
                            style={{ color: 'var(--timbergem-muted)' }}
                          >
                            {item.type} • {item.id}
                          </div>
                        </div>
                        {item.incomplete && (
                          <AlertTriangle 
                            className="h-3 w-3 flex-shrink-0" 
                            style={{ color: 'var(--timbergem-warn)' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="attention" className="flex-1 px-4 pb-4">
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {needsAttentionItems.map((item, index) => (
                  <NeedsAttentionRow
                    key={index}
                    icon={item.icon}
                    name={item.name}
                    issue={item.issue}
                    actions={item.actions}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Inspector Section */}
      <div 
        className="border-t p-4"
        style={{ borderColor: 'var(--timbergem-border)' }}
      >
        <h3 className="label mb-3" style={{ color: 'var(--timbergem-muted)' }}>
          Inspector
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="caption block mb-1" style={{ color: 'var(--timbergem-muted)' }}>
              Selected
            </label>
            <div 
              className="p-2 rounded text-center caption"
              style={{ 
                backgroundColor: 'var(--timbergem-panel-elevated)',
                color: 'var(--timbergem-muted)'
              }}
            >
              No selection
            </div>
          </div>

          <div>
            <label className="caption block mb-1" style={{ color: 'var(--timbergem-muted)' }}>
              Properties
            </label>
            <div 
              className="p-2 rounded text-center caption"
              style={{ 
                backgroundColor: 'var(--timbergem-panel-elevated)',
                color: 'var(--timbergem-muted)'
              }}
            >
              Select an entity to view properties
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}