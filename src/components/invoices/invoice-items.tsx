'use client'

import { useState, useCallback } from 'react'
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Calculator,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/invoices/generator'

export interface InvoiceItem {
  id?: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface InvoiceItemsProps {
  items: InvoiceItem[]
  onChange: (items: InvoiceItem[]) => void
  currency?: string
  taxRate?: number
  onTaxRateChange?: (rate: number) => void
  readOnly?: boolean
  className?: string
}

interface SortableItemProps {
  item: InvoiceItem
  index: number
  currency: string
  onUpdate: (index: number, field: keyof InvoiceItem, value: string | number) => void
  onDelete: (index: number) => void
  readOnly: boolean
}

function SortableItem({ item, index, currency, onUpdate, onDelete, readOnly }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id || `item-${index}` })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }
  
  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={cn(
        isDragging && 'bg-muted/50',
        'group'
      )}
    >
      {!readOnly && (
        <TableCell className="w-10">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="size-4" />
          </button>
        </TableCell>
      )}
      <TableCell className="w-12 text-center">
        <Badge variant="outline" className="font-mono">
          {index + 1}
        </Badge>
      </TableCell>
      <TableCell>
        {readOnly ? (
          <span className="text-sm">{item.description}</span>
        ) : (
          <Textarea
            value={item.description}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
            placeholder="Description de l'article..."
            className="min-h-[40px] resize-none"
            rows={1}
          />
        )}
      </TableCell>
      <TableCell className="w-24">
        {readOnly ? (
          <span className="text-sm text-right block">{item.quantity}</span>
        ) : (
          <Input
            type="number"
            value={item.quantity || ''}
            onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value) || 0)}
            min="0.01"
            step="0.01"
            className="text-right"
          />
        )}
      </TableCell>
      <TableCell className="w-32">
        {readOnly ? (
          <span className="text-sm text-right block">
            {formatCurrency(item.unitPrice, currency)}
          </span>
        ) : (
          <Input
            type="number"
            value={item.unitPrice || ''}
            onChange={(e) => onUpdate(index, 'unitPrice', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            className="text-right"
          />
        )}
      </TableCell>
      <TableCell className="w-32 text-right font-medium">
        {formatCurrency(item.total, currency)}
      </TableCell>
      {!readOnly && (
        <TableCell className="w-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(index)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  )
}

export function InvoiceItems({
  items,
  onChange,
  currency = 'GNF',
  taxRate = 0,
  onTaxRateChange,
  readOnly = false,
  className
}: InvoiceItemsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )
  
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax
  
  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex(
          (item) => (item.id || `item-${items.indexOf(item)}`) === active.id
        )
        const newIndex = items.findIndex(
          (item) => (item.id || `item-${items.indexOf(item)}`) === over.id
        )
        
        const newItems = arrayMove(items, oldIndex, newIndex)
        onChange(newItems)
      }
    },
    [items, onChange]
  )
  
  // Update item field
  const updateItem = useCallback(
    (index: number, field: keyof InvoiceItem, value: string | number) => {
      const newItems = [...items]
      newItems[index] = {
        ...newItems[index],
        [field]: value
      }
      
      // Recalculate total
      if (field === 'quantity' || field === 'unitPrice') {
        newItems[index].total = 
          (newItems[index].quantity || 0) * (newItems[index].unitPrice || 0)
      }
      
      onChange(newItems)
    },
    [items, onChange]
  )
  
  // Add new item
  const addItem = useCallback(() => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }
    onChange([...items, newItem])
  }, [items, onChange])
  
  // Delete item
  const deleteItem = useCallback(
    (index: number) => {
      const newItems = items.filter((_, i) => i !== index)
      onChange(newItems)
    },
    [items, onChange]
  )
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="size-5" />
            Articles
          </CardTitle>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-1"
              >
                <Plus className="size-4" />
                Ajouter
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="size-12 mx-auto mb-2 opacity-50" />
              <p>Aucun article</p>
              {!readOnly && (
                <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
                  <Plus className="size-4 mr-1" />
                  Ajouter un article
                </Button>
              )}
            </div>
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      {!readOnly && <TableHead className="w-10"></TableHead>}
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24 text-right">Qté</TableHead>
                      <TableHead className="w-32 text-right">Prix unit.</TableHead>
                      <TableHead className="w-32 text-right">Total</TableHead>
                      {!readOnly && <TableHead className="w-10"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={items.map((item, i) => item.id || `item-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {items.map((item, index) => (
                        <SortableItem
                          key={item.id || `item-${index}`}
                          item={item}
                          index={index}
                          currency={currency}
                          onUpdate={updateItem}
                          onDelete={deleteItem}
                          readOnly={readOnly}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
              
              {/* Totals section */}
              <div className="mt-4 border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sous-total HT</span>
                      <span className="font-medium">
                        {formatCurrency(subtotal, currency)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">TVA</span>
                        {!readOnly && onTaxRateChange ? (
                          <Input
                            type="number"
                            value={taxRate}
                            onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-16 h-7 text-xs"
                          />
                        ) : (
                          <Badge variant="outline" className="font-mono">
                            {taxRate}%
                          </Badge>
                        )}
                      </div>
                      <span className="font-medium">
                        {formatCurrency(tax, currency)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-base font-semibold border-t pt-2">
                      <span>Total TTC</span>
                      <span className="text-primary">
                        {formatCurrency(total, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// Compact version for read-only display
export function InvoiceItemsCompact({
  items,
  currency = 'GNF'
}: {
  items: InvoiceItem[]
  currency?: string
}) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  
  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={item.id || index} className="flex justify-between text-sm">
          <span className="truncate flex-1">
            {item.quantity}x {item.description}
          </span>
          <span className="font-medium ml-2">
            {formatCurrency(item.total, currency)}
          </span>
        </div>
      ))}
      <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-1">
        <span>Total</span>
        <span>{formatCurrency(subtotal, currency)}</span>
      </div>
    </div>
  )
}
