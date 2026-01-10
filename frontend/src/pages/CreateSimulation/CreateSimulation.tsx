import React, { useState, useRef, useEffect } from 'react';
import type { MouseEvent } from 'react';
import * as d3 from 'd3';
import './CreateSimulation.css';

// Типы блоков
interface BlockType {
  id: string;
  label: string;
  color: string;
  icon: string;
}

const BLOCK_TYPES: BlockType[] = [
  { id: 'source', label: 'Источник ресурсов', color: '#4CAF50', icon: '📦' },
  { id: 'warehouse', label: 'Склад', color: '#2196F3', icon: '🏭' },
  { id: 'processing', label: 'Обработка', color: '#FF9800', icon: '⚙️' },
  { id: 'collection', label: 'Сбор ресурсов', color: '#9C27B0', icon: '🔧' }
];

// Интерфейс для префаба
interface Prefab {
  id: number;
  name: string;
  blockType: string;
  customName?: string;
  productionRate?: number;
  createdAt: Date;
}

// Размеры блоков
const BLOCK_SIZE = { width: 225, height: 120 };

// Интерфейс для блока
interface Block {
  id: number;
  type: string;
  x: number;
  y: number;
  customName?: string;
  productionRate?: number;
}

// Функция для разбиения текста на строки
const wrapText = (text: string, maxWidth: number = 180, fontSize: number = 14): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    // Приблизительная ширина текста в пикселях (примерно 0.6 * fontSize на символ)
    const width = (currentLine.length + word.length) * fontSize * 0.6;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  
  // Если слишком много строк, обрезаем и добавляем многоточие
  if (lines.length > 2) {
    return [lines[0], lines[1] + '...'];
  }
  return lines;
};

const CreateSimulation: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [nextId, setNextId] = useState<number>(1);
  const [draggingBlockType, setDraggingBlockType] = useState<string | null>(null);
  const [draggingPrefabId, setDraggingPrefabId] = useState<number | null>(null);
  const [isDraggingFromPanel, setIsDraggingFromPanel] = useState<boolean>(false);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editProductionRate, setEditProductionRate] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'library' | 'prefabs'>('library');
  const [prefabs, setPrefabs] = useState<Prefab[]>([
    { id: 1, name: 'Быстрый источник', blockType: 'source', productionRate: 50, createdAt: new Date() },
    { id: 2, name: 'Большой склад', blockType: 'warehouse', customName: 'Склад №1', createdAt: new Date() },
  ]);
  const [nextPrefabId, setNextPrefabId] = useState<number>(3);
  const [savePrefabModalOpen, setSavePrefabModalOpen] = useState<boolean>(false);
  const [prefabName, setPrefabName] = useState<string>('');
  const [copiedBlock, setCopiedBlock] = useState<Block | null>(null);
  const [showEditIcon, setShowEditIcon] = useState<number | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const d3ContainerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const prefabNameInputRef = useRef<HTMLInputElement>(null);

  // Инициализация D3 контейнера
  useEffect(() => {
    if (!svgRef.current) return;

    d3ContainerRef.current = d3.select(svgRef.current)
      .append('g')
      .attr('class', 'blocks-container') as d3.Selection<SVGGElement, unknown, null, undefined>;

    return () => {
      if (d3ContainerRef.current) {
        d3ContainerRef.current.remove();
      }
    };
  }, []);

  // Обработка горячих клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+C - копировать
      if (e.ctrlKey && e.key === 'c' && selectedBlockId) {
        const blockToCopy = blocks.find(b => b.id === selectedBlockId);
        if (blockToCopy) {
          setCopiedBlock({...blockToCopy});
        }
      }
      
      // Ctrl+V - вставить
      if (e.ctrlKey && e.key === 'v' && copiedBlock) {
        pasteBlock();
      }
      
      // Delete - удалить выделенный блок
      if (e.key === 'Delete' && selectedBlockId) {
        if (window.confirm('Вы уверены, что хотите удалить выделенный блок?')) {
          handleDeleteBlock(selectedBlockId);
        }
      }
      
      // Escape - снять выделение
      if (e.key === 'Escape') {
        setSelectedBlockId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blocks, selectedBlockId, copiedBlock]);

  // Обновление D3 при изменении блоков
  useEffect(() => {
    if (!d3ContainerRef.current || !svgRef.current) return;

    const container = d3ContainerRef.current;
    const svgNode = svgRef.current;

    // Объединяем данные с элементами
    const blockSelection = container
      .selectAll<SVGGElement, Block>('.draggable-block')
      .data(blocks, (d: Block) => d.id.toString());

    // Удаляем старые блоки
    blockSelection.exit().remove();

    // Добавляем новые блоки
    const newBlocks = blockSelection
      .enter()
      .append('g')
      .attr('class', (d: Block) => 
        `draggable-block ${selectedBlockId === d.id ? 'selected' : ''}`
      )
      .attr('id', (d: Block) => `block-${d.id}`)
      .attr('transform', (d: Block) => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, Block>()
          .on('start', function (event, d) {
            d3.select(this).raise().classed('dragging', true);
            setSelectedBlockId(d.id);
          })
          .on('drag', function (event, d) {
            const newX = Math.max(0, Math.min(event.x, svgNode.clientWidth - BLOCK_SIZE.width));
            const newY = Math.max(0, Math.min(event.y, svgNode.clientHeight - BLOCK_SIZE.height));
            
            d3.select(this)
              .attr('transform', `translate(${newX}, ${newY})`);
            
            // Обновляем состояние
            setBlocks(prev => prev.map(block => 
              block.id === d.id ? { ...block, x: newX, y: newY } : block
            ));
          })
          .on('end', function () {
            d3.select(this).classed('dragging', false);
          })
      )
      .on('click', function (event, d) {
        event.stopPropagation();
        setSelectedBlockId(d.id);
      })
      .on('dblclick', function(event, d) {
        event.stopPropagation();
        openEditModal(d);
      })
      .on('mouseenter', function(event, d) {
        setShowEditIcon(d.id);
      })
      .on('mouseleave', function(event, d) {
        if (showEditIcon === d.id) {
          setShowEditIcon(null);
        }
      });

    // Прямоугольник блока
    newBlocks
      .append('rect')
      .attr('width', BLOCK_SIZE.width)
      .attr('height', BLOCK_SIZE.height)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', (d: Block) => {
        const typeInfo = BLOCK_TYPES.find(t => t.id === d.type);
        return typeInfo ? typeInfo.color : '#CCCCCC';
      })
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Иконка блока
    newBlocks
      .append('text')
      .attr('x', 30)
      .attr('y', 35)
      .attr('font-size', '24px')
      .attr('fill', 'white')
      .attr('pointer-events', 'none')
      .text((d: Block) => {
        const typeInfo = BLOCK_TYPES.find(t => t.id === d.type);
        return typeInfo ? typeInfo.icon : '?';
      });

    // Название блока с переносом строк
    const nameText = newBlocks
      .append('text')
      .attr('class', 'block-name-text')
      .attr('x', BLOCK_SIZE.width / 2)
      .attr('y', d => d.type === 'source' ? BLOCK_SIZE.height / 2 : BLOCK_SIZE.height / 2 + 10)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .attr('font-size', '14px')
      .attr('pointer-events', 'none');

    // Добавляем tspan для каждой строки названия
    nameText.each(function(d: Block) {
      const text = d.customName || BLOCK_TYPES.find(t => t.id === d.type)?.label || 'Неизвестный блок';
      const lines = wrapText(text);
      const textElement = d3.select(this);
      
      textElement.selectAll('*').remove();
      
      lines.forEach((line, index) => {
        textElement.append('tspan')
          .attr('x', BLOCK_SIZE.width / 2)
          .attr('dy', index === 0 ? '0' : '1.2em')
          .text(line);
      });
    });

    // Скорость добычи (только для источника ресурсов) с переносом строк
    const productionText = newBlocks
      .append('text')
      .attr('class', 'production-rate-text')
      .attr('x', BLOCK_SIZE.width / 2)
      .attr('y', BLOCK_SIZE.height / 2 + 30)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none');

    productionText.each(function(d: Block) {
      if (d.type === 'source') {
        const rate = d.productionRate || 0;
        const text = `Скорость: ${rate}/ед.`;
        const lines = wrapText(text, 150, 12);
        const textElement = d3.select(this);
        
        textElement.selectAll('*').remove();
        
        lines.forEach((line, index) => {
          textElement.append('tspan')
            .attr('x', BLOCK_SIZE.width / 2)
            .attr('dy', index === 0 ? '0' : '1.2em')
            .text(line);
        });
      }
    });

    // Иконка редактирования (увеличенная и с лучшей доступностью)
    const editIconGroup = newBlocks
      .append('g')
      .attr('class', 'edit-icon-group')
      .attr('transform', `translate(${BLOCK_SIZE.width - 35}, 25)`)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        event.stopPropagation();
        openEditModal(d);
      })
      .on('mouseenter', function() {
        d3.select(this).select('circle').style('fill', '#f0f0f0');
      })
      .on('mouseleave', function() {
        d3.select(this).select('circle').style('fill', 'white');
      });

    // Большой круг для лучшей кликабельности
    editIconGroup
      .append('circle')
      .attr('r', 18) // Увеличен радиус
      .attr('fill', 'white')
      .attr('opacity', (d: Block) => showEditIcon === d.id ? 0.9 : 0.7) // Всегда видна
      .style('pointer-events', 'all');

    // Карандашик внутри круга
    editIconGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '14px')
      .attr('fill', '#333')
      .attr('opacity', (d: Block) => showEditIcon === d.id ? 1 : 0.8) // Всегда видна
      .style('pointer-events', 'none')
      .text('✎');

    // Обновляем существующие блоки
    blockSelection
      .style('cursor', 'pointer')
      .attr('class', (d: Block) => 
        `draggable-block ${selectedBlockId === d.id ? 'selected' : ''}`
      )
      .attr('transform', (d: Block) => `translate(${d.x}, ${d.y})`)
      .on('dblclick', function(event, d) {
        event.stopPropagation();
        openEditModal(d);
      });

    // Обновляем название блоков с переносом строк
    blockSelection.select('.block-name-text')
      .each(function(d: Block) {
        const text = d.customName || BLOCK_TYPES.find(t => t.id === d.type)?.label || 'Неизвестный блок';
        const lines = wrapText(text);
        const textElement = d3.select(this);
        
        textElement.selectAll('*').remove();
        
        lines.forEach((line, index) => {
          textElement.append('tspan')
            .attr('x', BLOCK_SIZE.width / 2)
            .attr('dy', index === 0 ? '0' : '1.2em')
            .text(line);
        });
      });

    // Обновляем скорость добычи с переносом строк
    blockSelection.select('.production-rate-text')
      .each(function(d: Block) {
        if (d.type === 'source') {
          const rate = d.productionRate || 0;
          const text = `Скорость: ${rate}/ед.`;
          const lines = wrapText(text, 150, 12);
          const textElement = d3.select(this);
          
          textElement.selectAll('*').remove();
          
          lines.forEach((line, index) => {
            textElement.append('tspan')
              .attr('x', BLOCK_SIZE.width / 2)
              .attr('dy', index === 0 ? '0' : '1.2em')
              .text(line);
          });
        } else {
          d3.select(this).selectAll('*').remove();
        }
      });

    // Обновляем видимость иконки редактирования
    blockSelection.select('.edit-icon-group')
      .select('circle')
      .attr('opacity', (d: Block) => showEditIcon === d.id ? 0.9 : 0.7);
      
    blockSelection.select('.edit-icon-group')
      .select('text')
      .attr('opacity', (d: Block) => showEditIcon === d.id ? 1 : 0.8);

  }, [blocks, selectedBlockId, showEditIcon]);

  // Остальные функции остаются без изменений...
  // [Весь остальной код остается таким же, начиная с handleDragStart и до конца компонента]

  // Начало перетаскивания из панели блоков
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('blockType', type);
    setDraggingBlockType(type);
    setIsDraggingFromPanel(true);
    
    const dragIcon = document.createElement('div');
    dragIcon.innerHTML = BLOCK_TYPES.find(t => t.id === type)?.icon || '📦';
    dragIcon.style.fontSize = '24px';
    dragIcon.style.opacity = '0.5';
    document.body.appendChild(dragIcon);
    e.dataTransfer.setDragImage(dragIcon, 10, 10);
    
    setTimeout(() => document.body.removeChild(dragIcon), 0);
  };

  // Начало перетаскивания префаба
  const handlePrefabDragStart = (e: React.DragEvent, prefab: Prefab) => {
    e.dataTransfer.setData('prefab', JSON.stringify(prefab));
    setDraggingPrefabId(prefab.id);
    setIsDraggingFromPanel(true);
    
    const dragIcon = document.createElement('div');
    const typeInfo = BLOCK_TYPES.find(t => t.id === prefab.blockType);
    dragIcon.innerHTML = typeInfo?.icon || '📦';
    dragIcon.style.fontSize = '24px';
    dragIcon.style.opacity = '0.5';
    document.body.appendChild(dragIcon);
    e.dataTransfer.setDragImage(dragIcon, 10, 10);
    
    setTimeout(() => document.body.removeChild(dragIcon), 0);
  };

  // Перетаскивание над рабочей областью
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    if (workspaceRef.current) {
      workspaceRef.current.classList.add('drag-over');
    }
  };

  // Завершение перетаскивания над рабочей областью
  const handleDragLeave = () => {
    if (workspaceRef.current) {
      workspaceRef.current.classList.remove('drag-over');
    }
  };

  // Бросок блока или префаба в рабочую область
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (workspaceRef.current) {
      workspaceRef.current.classList.remove('drag-over');
    }
    
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    // Вычисляем координаты относительно SVG
    const x = e.clientX - svgRect.left - BLOCK_SIZE.width / 2;
    const y = e.clientY - svgRect.top - BLOCK_SIZE.height / 2;

    // Проверяем границы
    const maxX = svgRect.width - BLOCK_SIZE.width;
    const maxY = svgRect.height - BLOCK_SIZE.height;
    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));

    // Проверяем, что перетаскивается: блок или префаб
    const prefabData = e.dataTransfer.getData('prefab');
    const blockType = e.dataTransfer.getData('blockType');

    if (prefabData) {
      // Создаем блок из префаба
      const prefab: Prefab = JSON.parse(prefabData);
      const newBlock: Block = {
        id: nextId,
        type: prefab.blockType,
        x: clampedX,
        y: clampedY,
        customName: prefab.customName,
        productionRate: prefab.productionRate
      };

      setBlocks(prev => [...prev, newBlock]);
      setNextId(prev => prev + 1);
      setDraggingPrefabId(null);
    } else if (blockType) {
      // Создаем обычный блок
      const newBlock: Block = {
        id: nextId,
        type: blockType,
        x: clampedX,
        y: clampedY,
        ...(blockType === 'source' && { productionRate: 10 })
      };

      setBlocks(prev => [...prev, newBlock]);
      setNextId(prev => prev + 1);
      setDraggingBlockType(null);
    }

    setIsDraggingFromPanel(false);
  };

  // Копирование выделенного блока
  const handleCopyBlock = () => {
    if (selectedBlockId) {
      const blockToCopy = blocks.find(b => b.id === selectedBlockId);
      if (blockToCopy) {
        setCopiedBlock({...blockToCopy});
      }
    }
  };

  // Вставка скопированного блока
  const pasteBlock = () => {
    if (!copiedBlock) return;
    
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    // Позиция для вставки - рядом с выделенным блоком или в центре
    let newX = 100;
    let newY = 100;
    
    if (selectedBlockId) {
      const selectedBlock = blocks.find(b => b.id === selectedBlockId);
      if (selectedBlock) {
        newX = selectedBlock.x + 50;
        newY = selectedBlock.y + 50;
      }
    } else {
      newX = svgRect.width / 2 - BLOCK_SIZE.width / 2;
      newY = svgRect.height / 2 - BLOCK_SIZE.height / 2;
    }

    // Проверяем границы
    const maxX = svgRect.width - BLOCK_SIZE.width;
    const maxY = svgRect.height - BLOCK_SIZE.height;
    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    const newBlock: Block = {
      id: nextId,
      type: copiedBlock.type,
      x: clampedX,
      y: clampedY,
      customName: copiedBlock.customName,
      productionRate: copiedBlock.productionRate
    };

    setBlocks(prev => [...prev, newBlock]);
    setNextId(prev => prev + 1);
    setSelectedBlockId(nextId);
  };

  // Удаление блока
  const handleDeleteBlock = (id: number) => {
    setBlocks(prev => prev.filter(block => block.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  // Удаление префаба
  const handleDeletePrefab = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот префаб?')) {
      setPrefabs(prev => prev.filter(prefab => prefab.id !== id));
    }
  };

  // Очистка всех блоков
  const handleClearAll = () => {
    if (blocks.length > 0 && window.confirm('Вы уверены, что хотите удалить все блоки?')) {
      setBlocks([]);
      setNextId(1);
      setSelectedBlockId(null);
    }
  };

  // Обработчик клика по рабочей области
  const handleWorkspaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    if (
      target === workspaceRef.current || 
      target.tagName === 'svg' ||
      (target.classList && !target.classList.contains('draggable-block') && 
       !target.classList.contains('edit-icon'))
    ) {
      setSelectedBlockId(null);
    }
  };

  // Отмена перетаскивания
  const handleDragEnd = () => {
    setDraggingBlockType(null);
    setDraggingPrefabId(null);
    setIsDraggingFromPanel(false);
    if (workspaceRef.current) {
      workspaceRef.current.classList.remove('drag-over');
    }
  };

  // Открытие модального окна для редактирования блока
  const openEditModal = (block: Block) => {
    setEditingBlock(block);
    setEditName(block.customName || BLOCK_TYPES.find(t => t.id === block.type)?.label || '');
    setEditProductionRate(block.productionRate || 0);
    setEditModalOpen(true);
  };

  // Сохранение изменений блока
  const handleSaveName = () => {
    if (editingBlock) {
      setBlocks(prev => prev.map(block => 
        block.id === editingBlock.id 
          ? { 
              ...block, 
              customName: editName.trim() || undefined,
              ...(editingBlock.type === 'source' && { productionRate: editProductionRate })
            }
          : block
      ));
      setEditModalOpen(false);
      setEditingBlock(null);
      setEditName('');
      setEditProductionRate(0);
    }
  };

  // Открытие модального окна для сохранения префаба
  const openSavePrefabModal = () => {
    if (editingBlock) {
      const defaultName = editingBlock.customName || BLOCK_TYPES.find(t => t.id === editingBlock.type)?.label || 'Префаб';
      setPrefabName(defaultName);
      setSavePrefabModalOpen(true);
    }
  };

  // Сохранение префаба
  const handleSavePrefab = () => {
    if (editingBlock && prefabName.trim()) {
      const newPrefab: Prefab = {
        id: nextPrefabId,
        name: prefabName.trim(),
        blockType: editingBlock.type,
        customName: editingBlock.customName,
        productionRate: editingBlock.productionRate,
        createdAt: new Date()
      };

      setPrefabs(prev => [...prev, newPrefab]);
      setNextPrefabId(prev => prev + 1);
      setSavePrefabModalOpen(false);
      setPrefabName('');
    }
  };

  // Закрытие модальных окон
  const handleCloseModal = () => {
    setEditModalOpen(false);
    setSavePrefabModalOpen(false);
    setEditingBlock(null);
    setEditName('');
    setEditProductionRate(0);
    setPrefabName('');
  };

  // Обработка нажатия клавиши в модальном окне
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (savePrefabModalOpen) {
        handleSavePrefab();
      } else {
        handleSaveName();
      }
    } else if (e.key === 'Escape') {
      handleCloseModal();
    }
  };

  // Фокусировка на поле ввода при открытии модального окна
  useEffect(() => {
    if (editModalOpen && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
    if (savePrefabModalOpen && prefabNameInputRef.current) {
      prefabNameInputRef.current.focus();
      prefabNameInputRef.current.select();
    }
  }, [editModalOpen, savePrefabModalOpen]);

  return (
    <>
      <div className="d3-blocks-container">
        {/* Левая панель с элементами */}
        <div className="blocks-panel">
          <div className="panel-header">
            <div className="panel-tabs">
              <button 
                className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
                onClick={() => setActiveTab('library')}
              >
                📚 Библиотека блоков
              </button>
              <button 
                className={`tab-btn ${activeTab === 'prefabs' ? 'active' : ''}`}
                onClick={() => setActiveTab('prefabs')}
              >
                🧩 Префабы ({prefabs.length})
              </button>
            </div>
          </div>
          
          <div className="panel-content">
            {activeTab === 'library' ? (
              <div className="blocks-library">
                {BLOCK_TYPES.map(type => (
                  <div
                    key={type.id}
                    className={`block-item ${draggingBlockType === type.id ? 'dragging' : ''}`}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, type.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="block-item-icon" style={{ backgroundColor: type.color }}>
                      {type.icon}
                    </div>
                    <span className="block-item-label">{type.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="prefabs-library">
                {prefabs.length === 0 ? (
                  <div className="empty-prefabs">
                    <div className="empty-icon">📁</div>
                    <p className="empty-title">Нет сохраненных префабов</p>
                  </div>
                ) : (
                  <div className="prefabs-list">
                    {prefabs.map(prefab => {
                      const typeInfo = BLOCK_TYPES.find(t => t.id === prefab.blockType);
                      return (
                        <div
                          key={prefab.id}
                          className={`prefab-item ${draggingPrefabId === prefab.id ? 'dragging' : ''}`}
                          draggable="true"
                          onDragStart={(e) => handlePrefabDragStart(e, prefab)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="prefab-header">
                            <div className="prefab-icon" style={{ backgroundColor: typeInfo?.color || '#CCC' }}>
                              {typeInfo?.icon || '📦'}
                            </div>
                            <span className="prefab-name">{prefab.name}</span>
                            <button 
                              className="delete-prefab-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePrefab(prefab.id);
                              }}
                              aria-label="Удалить префаб"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="panel-controls">
            <div className="control-buttons">
              <button onClick={handleClearAll} className="btn btn-danger">
                🗑️ Очистить все
              </button>
              <button 
                onClick={handleCopyBlock} 
                className="btn btn-secondary"
                disabled={!selectedBlockId}
              >
                📋 Копировать
              </button>
              <button 
                onClick={pasteBlock} 
                className="btn btn-secondary"
                disabled={!copiedBlock}
              >
                📄 Вставить
              </button>
            </div>
            <div className="stats-info">
              <div className="stat-item">
                <span className="stat-label">Блоков:</span>
                <span className="stat-value">{blocks.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Рабочая область */}
        <div className="workspace-area">
          <div className="workspace-header">
            <h2>Рабочая область</h2>
            <div className="workspace-info">
              <span className="info-item">Блоков: {blocks.length}</span>
            </div>
          </div>

          <div 
            ref={workspaceRef}
            className="workspace-container"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleWorkspaceClick}
          >
            <svg 
              ref={svgRef}
              width="100%"
              height="100%"
              className="d3-svg-canvas"
            >
              {/* Сетка для удобства */}
              <defs>
                <pattern 
                  id="grid" 
                  width="50" 
                  height="50" 
                  patternUnits="userSpaceOnUse"
                >
                  <path 
                    d="M 50 0 L 0 0 0 50" 
                    fill="none" 
                    stroke="#e0e0e0" 
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              
              <rect
                width="100%"
                height="100%"
                fill="url(#grid)"
              />
              
              {/* Тень для области */}
              <rect
                width="100%"
                height="100%"
                fill="none"
                stroke="#ddd"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Модальное окно для редактирования блока */}
      {editModalOpen && editingBlock && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Редактирование блока</h3>
              <button 
                className="modal-close" 
                onClick={handleCloseModal}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="edit-block-preview">
                <div 
                  className="block-preview-icon"
                  style={{ 
                    backgroundColor: BLOCK_TYPES.find(t => t.id === editingBlock.type)?.color 
                  }}
                >
                  {BLOCK_TYPES.find(t => t.id === editingBlock.type)?.icon}
                </div>
                <div className="block-preview-info">
                  <span className="block-type">
                    Тип: {BLOCK_TYPES.find(t => t.id === editingBlock.type)?.label}
                  </span>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="block-name">Название блока:</label>
                <input
                  ref={nameInputRef}
                  id="block-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleModalKeyDown}
                  placeholder="Введите название блока"
                  className="name-input"
                />
              </div>

              {editingBlock.type === 'source' && (
                <div className="form-group">
                  <label htmlFor="production-rate">Скорость добычи:</label>
                  <input
                    id="production-rate"
                    type="number"
                    min="0"
                    step="0.1"
                    value={editProductionRate}
                    onChange={(e) => setEditProductionRate(parseFloat(e.target.value) || 0)}
                    onKeyDown={handleModalKeyDown}
                    placeholder="Введите скорость добычи"
                    className="number-input"
                  />
                </div>
              )}

              <div className="form-group">
                <button 
                  className="btn btn-primary btn-block"
                  onClick={openSavePrefabModal}
                >
                  Сохранить как префаб
                </button>
              </div>

              <div className="form-group">
                <button 
                  className="btn btn-danger btn-block"
                  onClick={() => {
                    if (window.confirm('Вы уверены, что хотите удалить этот блок?')) {
                      handleDeleteBlock(editingBlock.id);
                      handleCloseModal();
                    }
                  }}
                >
                  Удалить блок
                </button>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={handleCloseModal}
              >
                Отмена
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveName}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для сохранения префаба */}
      {savePrefabModalOpen && editingBlock && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Сохранить как префаб</h3>
              <button 
                className="modal-close" 
                onClick={handleCloseModal}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="prefab-name">Название префаба:</label>
                <input
                  ref={prefabNameInputRef}
                  id="prefab-name"
                  type="text"
                  value={prefabName}
                  onChange={(e) => setPrefabName(e.target.value)}
                  onKeyDown={handleModalKeyDown}
                  placeholder="Введите название префаба"
                  className="name-input"
                />
              </div>

              <div className="prefab-preview">
                <h4>Параметры префаба:</h4>
                <div className="prefab-preview-details">
                  <div className="preview-row">
                    <span className="preview-label">Тип блока:</span>
                    <span className="preview-value">
                      {BLOCK_TYPES.find(t => t.id === editingBlock.type)?.label}
                    </span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Название:</span>
                    <span className="preview-value">
                      {editName.trim() || BLOCK_TYPES.find(t => t.id === editingBlock.type)?.label || 'По умолчанию'}
                    </span>
                  </div>
                  {editingBlock.type === 'source' && (
                    <div className="preview-row">
                      <span className="preview-label">Скорость добычи:</span>
                      <span className="preview-value">{editProductionRate || 0}/ед.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={handleCloseModal}
              >
                Отмена
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSavePrefab}
                disabled={!prefabName.trim()}
              >
                Сохранить префаб
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateSimulation;