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
const CONNECTION_POINT_SIZE = 16;

// Интерфейс для блока
interface Block {
  id: number;
  type: string;
  x: number;
  y: number;
  customName?: string;
  productionRate?: number;
}

// Интерфейс для соединения
interface Connection {
  id: number;
  sourceBlockId: number;
  targetBlockId: number;
  sourcePoint: 'output' | 'input';
  targetPoint: 'output' | 'input';
}

// Тип для точки соединения
interface ConnectionPoint {
  blockId: number;
  type: 'input' | 'output';
  x: number;
  y: number;
}

// Функция для разбиения текста на строки
const wrapText = (text: string, maxWidth: number = 180, fontSize: number = 14): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = (currentLine.length + word.length) * fontSize * 0.6;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  
  if (lines.length > 2) {
    return [lines[0], lines[1] + '...'];
  }
  return lines;
};

// Функция для вычисления координат точек входа/выхода
const getConnectionPoints = (block: Block): { input: { x: number, y: number }, output: { x: number, y: number } } => {
  return {
    input: {
      x: block.x - CONNECTION_POINT_SIZE / 2,
      y: block.y + BLOCK_SIZE.height / 2 - CONNECTION_POINT_SIZE / 2
    },
    output: {
      x: block.x + BLOCK_SIZE.width - CONNECTION_POINT_SIZE / 2,
      y: block.y + BLOCK_SIZE.height / 2 - CONNECTION_POINT_SIZE / 2
    }
  };
};

// Функция для вычисления координат стрелки
const calculateArrowPath = (
  sourceBlock: Block, 
  targetBlock: Block, 
  sourcePoint: 'input' | 'output', 
  targetPoint: 'input' | 'output'
): string => {
  const sourcePoints = getConnectionPoints(sourceBlock);
  const targetPoints = getConnectionPoints(targetBlock);
  
  const startPoint = sourcePoint === 'output' ? sourcePoints.output : sourcePoints.input;
  const endPoint = targetPoint === 'input' ? targetPoints.input : targetPoints.output;
  
  // Смещения для красивого изгиба
  const startOffset = sourcePoint === 'output' ? 20 : -20;
  const endOffset = targetPoint === 'input' ? -20 : 20;
  
  const startX = startPoint.x + CONNECTION_POINT_SIZE / 2;
  const startY = startPoint.y + CONNECTION_POINT_SIZE / 2;
  const endX = endPoint.x + CONNECTION_POINT_SIZE / 2;
  const endY = endPoint.y + CONNECTION_POINT_SIZE / 2;
  
  // Кривая Безье с контрольными точками
  const controlPoint1X = startX + startOffset;
  const controlPoint1Y = startY;
  const controlPoint2X = endX + endOffset;
  const controlPoint2Y = endY;
  
  return `M ${startX} ${startY} 
          C ${controlPoint1X} ${controlPoint1Y}, 
            ${controlPoint2X} ${controlPoint2Y}, 
            ${endX} ${endY}`;
};

const CreateSimulation: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [nextId, setNextId] = useState<number>(1);
  const [nextConnectionId, setNextConnectionId] = useState<number>(1);
  const [draggingBlockType, setDraggingBlockType] = useState<string | null>(null);
  const [draggingPrefabId, setDraggingPrefabId] = useState<number | null>(null);
  const [isDraggingFromPanel, setIsDraggingFromPanel] = useState<boolean>(false);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
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
  const [connectingFrom, setConnectingFrom] = useState<ConnectionPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{blockId: number, type: 'input' | 'output'} | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const d3ContainerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const connectionsContainerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const prefabNameInputRef = useRef<HTMLInputElement>(null);

  // Ссылка для временного соединения
  const tempConnectionRef = useRef<SVGPathElement>(null);

  // Инициализация D3 контейнеров
  useEffect(() => {
    if (!svgRef.current) return;

    // Контейнер для соединений (должен быть под блоками)
    connectionsContainerRef.current = d3.select(svgRef.current)
      .append('g')
      .attr('class', 'connections-container') as d3.Selection<SVGGElement, unknown, null, undefined>;

    // Контейнер для блоков
    d3ContainerRef.current = d3.select(svgRef.current)
      .append('g')
      .attr('class', 'blocks-container') as d3.Selection<SVGGElement, unknown, null, undefined>;

    return () => {
      if (d3ContainerRef.current) d3ContainerRef.current.remove();
      if (connectionsContainerRef.current) connectionsContainerRef.current.remove();
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
      
      // Delete - удалить выделенный блок или соединение
      if (e.key === 'Delete') {
        if (selectedBlockId) {
          if (window.confirm('Вы уверены, что хотите удалить выделенный блок?')) {
            handleDeleteBlock(selectedBlockId);
          }
        } else if (selectedConnectionId) {
          if (window.confirm('Вы уверены, что хотите удалить выделенное соединение?')) {
            handleDeleteConnection(selectedConnectionId);
          }
        }
      }
      
      // Escape - снять выделение или отменить соединение
      if (e.key === 'Escape') {
        setSelectedBlockId(null);
        setSelectedConnectionId(null);
        setConnectingFrom(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blocks, selectedBlockId, selectedConnectionId, copiedBlock, connectingFrom]);

  // Обработка движения мыши при создании соединения
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!connectingFrom || !svgRef.current) return;
      
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;
      
      // Обновляем временную линию
      if (tempConnectionRef.current) {
        const startX = connectingFrom.x;
        const startY = connectingFrom.y;
        
        const path = `M ${startX} ${startY} L ${x} ${y}`;
        tempConnectionRef.current.setAttribute('d', path);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!connectingFrom || !svgRef.current) return;
      
      const svgRect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - svgRect.left;
      const mouseY = e.clientY - svgRect.top;
      
      // Ищем блок, на который упал курсор
      let targetBlockId: number | null = null;
      let targetPointType: 'input' | 'output' | null = null;
      
      blocks.forEach(block => {
        const points = getConnectionPoints(block);
        
        // Проверяем расстояние до входной точки
        const inputX = points.input.x + CONNECTION_POINT_SIZE / 2;
        const inputY = points.input.y + CONNECTION_POINT_SIZE / 2;
        const inputDistance = Math.sqrt(
          Math.pow(mouseX - inputX, 2) + Math.pow(mouseY - inputY, 2)
        );
        
        // Проверяем расстояние до выходной точки
        const outputX = points.output.x + CONNECTION_POINT_SIZE / 2;
        const outputY = points.output.y + CONNECTION_POINT_SIZE / 2;
        const outputDistance = Math.sqrt(
          Math.pow(mouseX - outputX, 2) + Math.pow(mouseY - outputY, 2)
        );
        
        // Если мы близко к точке
        const threshold = CONNECTION_POINT_SIZE * 2;
        
        if (inputDistance < threshold) {
          targetBlockId = block.id;
          targetPointType = 'input';
        } else if (outputDistance < threshold) {
          targetBlockId = block.id;
          targetPointType = 'output';
        }
      });
      
      // Если нашли точку, создаем соединение
      if (targetBlockId && targetPointType) {
        createConnection(connectingFrom.blockId, connectingFrom.type, targetBlockId, targetPointType);
      }
      
      // Очищаем временное соединение
      setConnectingFrom(null);
      if (tempConnectionRef.current) {
        tempConnectionRef.current.setAttribute('d', '');
      }
    };

    // Добавляем обработчики только при создании соединения
    if (connectingFrom) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp as any);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any);
        document.removeEventListener('mouseup', handleMouseUp as any);
      };
    }
  }, [connectingFrom, blocks]);

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
      .style('cursor', 'move');

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

    // Точка входа (слева)
    const inputPoint = newBlocks
      .append('g')
      .attr('class', 'connection-point input-point')
      .attr('transform', `translate(${-CONNECTION_POINT_SIZE / 2}, ${BLOCK_SIZE.height / 2 - CONNECTION_POINT_SIZE / 2})`)
      .style('cursor', 'pointer')
      .on('mousedown', function(event, d) {
        event.stopPropagation();
        handleConnectionPointMouseDown(d.id, 'input');
      })
      .on('mouseenter', function(event, d) {
        setHoveredPoint({ blockId: d.id, type: 'input' });
      })
      .on('mouseleave', function() {
        setHoveredPoint(null);
      });

    inputPoint
      .append('circle')
      .attr('r', CONNECTION_POINT_SIZE / 2)
      .attr('fill', '#4CAF50')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    inputPoint
      .append('text')
      .attr('x', CONNECTION_POINT_SIZE / 2)
      .attr('y', CONNECTION_POINT_SIZE / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .attr('pointer-events', 'none')
      .text('←');

    // Точка выхода (справа)
    const outputPoint = newBlocks
      .append('g')
      .attr('class', 'connection-point output-point')
      .attr('transform', `translate(${BLOCK_SIZE.width - CONNECTION_POINT_SIZE / 2}, ${BLOCK_SIZE.height / 2 - CONNECTION_POINT_SIZE / 2})`)
      .style('cursor', 'pointer')
      .on('mousedown', function(event, d) {
        event.stopPropagation();
        handleConnectionPointMouseDown(d.id, 'output');
      })
      .on('mouseenter', function(event, d) {
        setHoveredPoint({ blockId: d.id, type: 'output' });
      })
      .on('mouseleave', function() {
        setHoveredPoint(null);
      });

    outputPoint
      .append('circle')
      .attr('r', CONNECTION_POINT_SIZE / 2)
      .attr('fill', '#F44336')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    outputPoint
      .append('text')
      .attr('x', CONNECTION_POINT_SIZE / 2)
      .attr('y', CONNECTION_POINT_SIZE / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .attr('pointer-events', 'none')
      .text('→');

    // Иконка редактирования
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

    editIconGroup
      .append('circle')
      .attr('r', 18)
      .attr('fill', 'white')
      .attr('opacity', (d: Block) => showEditIcon === d.id ? 0.9 : 0.7)
      .style('pointer-events', 'all');

    editIconGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '14px')
      .attr('fill', '#333')
      .attr('opacity', (d: Block) => showEditIcon === d.id ? 1 : 0.8)
      .style('pointer-events', 'none')
      .text('✎');

    // Обработка перетаскивания блоков (упрощенная версия)
    const dragHandler = d3.drag<SVGGElement, Block>()
      .on('start', function(event, d) {
        d3.select(this).raise().classed('dragging', true);
        setSelectedBlockId(d.id);
        setSelectedConnectionId(null);
      })
      .on('drag', function(event, d) {
        const newX = Math.max(0, Math.min(event.x, svgNode.clientWidth - BLOCK_SIZE.width));
        const newY = Math.max(0, Math.min(event.y, svgNode.clientHeight - BLOCK_SIZE.height));
        
        d3.select(this)
          .attr('transform', `translate(${newX}, ${newY})`);
        
        // Обновляем состояние
        setBlocks(prev => prev.map(block => 
          block.id === d.id ? { ...block, x: newX, y: newY } : block
        ));
      })
      .on('end', function() {
        d3.select(this).classed('dragging', false);
      });

    // Применяем обработчик перетаскивания
    newBlocks.call(dragHandler);

    // Обработчики кликов
    newBlocks
      .on('click', function(event, d) {
        event.stopPropagation();
        setSelectedBlockId(d.id);
        setSelectedConnectionId(null);
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

    // Обновляем существующие блоки
    blockSelection
      .style('cursor', 'move')
      .attr('class', (d: Block) => 
        `draggable-block ${selectedBlockId === d.id ? 'selected' : ''}`
      )
      .attr('transform', (d: Block) => `translate(${d.x}, ${d.y})`)
      .on('dblclick', function(event, d) {
        event.stopPropagation();
        openEditModal(d);
      });

    // Обновляем название блоков
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

    // Обновляем скорость добычи
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

  }, [blocks, selectedBlockId, showEditIcon, hoveredPoint]);

  // Обновление D3 при изменении соединений
  useEffect(() => {
    if (!connectionsContainerRef.current) return;

    const container = connectionsContainerRef.current;
    
    // Объединяем данные с элементами
    const connectionSelection = container
      .selectAll<SVGGElement, Connection>('.connection')
      .data(connections, (d: Connection) => d.id.toString());

    // Удаляем старые соединения
    connectionSelection.exit().remove();

    // Добавляем новые соединения
    const newConnections = connectionSelection
      .enter()
      .append('g')
      .attr('class', (d: Connection) => 
        `connection ${selectedConnectionId === d.id ? 'selected' : ''}`
      )
      .attr('id', (d: Connection) => `connection-${d.id}`)
      .on('click', function(event, d) {
        event.stopPropagation();
        setSelectedConnectionId(d.id);
        setSelectedBlockId(null);
      });

    // Линия соединения
    newConnections
      .append('path')
      .attr('class', 'connection-line')
      .attr('fill', 'none')
      .attr('stroke', (d: Connection) => 
        selectedConnectionId === d.id ? '#FFEB3B' : '#2196F3'
      )
      .attr('stroke-width', (d: Connection) => 
        selectedConnectionId === d.id ? 3 : 2
      )
      .attr('marker-end', 'url(#arrowhead)');

    // Обновляем существующие соединения
    connectionSelection
      .attr('class', (d: Connection) => 
        `connection ${selectedConnectionId === d.id ? 'selected' : ''}`
      )
      .select('.connection-line')
      .attr('stroke', (d: Connection) => 
        selectedConnectionId === d.id ? '#FFEB3B' : '#2196F3'
      )
      .attr('stroke-width', (d: Connection) => 
        selectedConnectionId === d.id ? 3 : 2
      );

    // Обновляем пути для всех соединений
    container.selectAll('.connection-line')
      .attr('d', (d: Connection) => {
        const sourceBlock = blocks.find(b => b.id === d.sourceBlockId);
        const targetBlock = blocks.find(b => b.id === d.targetBlockId);
        
        if (!sourceBlock || !targetBlock) return '';
        
        return calculateArrowPath(sourceBlock, targetBlock, d.sourcePoint, d.targetPoint);
      });

  }, [connections, blocks, selectedConnectionId]);

  // Функция создания соединения
  const createConnection = (
    sourceBlockId: number, 
    sourcePointType: 'input' | 'output',
    targetBlockId: number, 
    targetPointType: 'input' | 'output'
  ) => {
    // Нельзя соединять с тем же блоком
    if (sourceBlockId === targetBlockId) {
      alert('Нельзя соединять блок с самим собой');
      return;
    }
    
    // Проверяем логику соединений
    // Можно соединять только выход с входом
    if (!(sourcePointType === 'output' && targetPointType === 'input')) {
      alert('Можно соединять только выход (красная точка) с входом (зеленая точка)');
      return;
    }
    
    // Определяем источник и цель
    const sourceBlockIdFinal = sourceBlockId;
    const targetBlockIdFinal = targetBlockId;
    
    // Проверяем, нет ли уже такого соединения
    const existingConnection = connections.find(c => 
      c.sourceBlockId === sourceBlockIdFinal && 
      c.targetBlockId === targetBlockIdFinal
    );
    
    if (existingConnection) {
      alert('Соединение уже существует');
      return;
    }
    
    // Создаем новое соединение
    const newConnection: Connection = {
      id: nextConnectionId,
      sourceBlockId: sourceBlockIdFinal,
      targetBlockId: targetBlockIdFinal,
      sourcePoint: 'output',
      targetPoint: 'input'
    };
    
    setConnections(prev => [...prev, newConnection]);
    setNextConnectionId(prev => prev + 1);
    
    // Выделяем созданное соединение
    setSelectedConnectionId(nextConnectionId);
    setSelectedBlockId(null);
  };

  // Обработчик нажатия на точку соединения
  const handleConnectionPointMouseDown = (blockId: number, pointType: 'input' | 'output') => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const points = getConnectionPoints(block);
    const point = pointType === 'input' ? points.input : points.output;
    
    setConnectingFrom({
      blockId,
      type: pointType,
      x: point.x + CONNECTION_POINT_SIZE / 2,
      y: point.y + CONNECTION_POINT_SIZE / 2
    });
    
    // Выделяем блок
    setSelectedBlockId(blockId);
    setSelectedConnectionId(null);
  };

  // Удаление соединения
  const handleDeleteConnection = (connectionId: number) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    if (selectedConnectionId === connectionId) {
      setSelectedConnectionId(null);
    }
  };

  // Удаление всех соединений связанных с блоком
  const handleDeleteBlockConnections = (blockId: number) => {
    setConnections(prev => prev.filter(conn => 
      conn.sourceBlockId !== blockId && conn.targetBlockId !== blockId
    ));
  };

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

    const x = e.clientX - svgRect.left - BLOCK_SIZE.width / 2;
    const y = e.clientY - svgRect.top - BLOCK_SIZE.height / 2;

    const maxX = svgRect.width - BLOCK_SIZE.width;
    const maxY = svgRect.height - BLOCK_SIZE.height;
    const clampedX = Math.max(0, Math.min(x, maxX));
    const clampedY = Math.max(0, Math.min(y, maxY));

    const prefabData = e.dataTransfer.getData('prefab');
    const blockType = e.dataTransfer.getData('blockType');

    if (prefabData) {
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
    // Удаляем все соединения связанные с этим блоком
    handleDeleteBlockConnections(id);
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

  // Очистка всех блоков и соединений
  const handleClearAll = () => {
    if ((blocks.length > 0 || connections.length > 0) && window.confirm('Вы уверены, что хотите удалить все блоки и соединения?')) {
      setBlocks([]);
      setConnections([]);
      setNextId(1);
      setNextConnectionId(1);
      setSelectedBlockId(null);
      setSelectedConnectionId(null);
      setConnectingFrom(null);
    }
  };

  // Обработчик клика по рабочей области
  const handleWorkspaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    if (
      target === workspaceRef.current || 
      target.tagName === 'svg' ||
      (target.classList && !target.classList.contains('draggable-block') && 
       !target.classList.contains('edit-icon') &&
       !target.classList.contains('connection-point'))
    ) {
      setSelectedBlockId(null);
      setSelectedConnectionId(null);
      setConnectingFrom(null);
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
              <div className="stat-item">
                <span className="stat-label">Соединений:</span>
                <span className="stat-value">{connections.length}</span>
              </div>
            </div>
            {connectingFrom && (
              <div className="connection-hint">
                <div className="hint-text">
                  <span className="hint-icon">🔗</span>
                  Перетащите к нужной точке и отпустите
                </div>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setConnectingFrom(null)}
                  style={{ marginTop: '8px' }}
                >
                  Отменить
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Рабочая область */}
        <div className="workspace-area">
          <div className="workspace-header">
            <h2>Рабочая область</h2>
            <div className="workspace-info">
              <span className="info-item">Блоков: {blocks.length}</span>
              <span className="info-item">Соединений: {connections.length}</span>
              {connectingFrom && (
                <span className="info-item connecting">
                  Создание соединения: перетащите к нужной точке
                </span>
              )}
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
              {/* Определения для стрелок */}
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
                
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#2196F3" />
                </marker>
                
                <marker
                  id="arrowhead-selected"
                  markerWidth="12"
                  markerHeight="8"
                  refX="10"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 12 4, 0 8" fill="#FFEB3B" />
                </marker>
              </defs>
              
              <rect
                width="100%"
                height="100%"
                fill="url(#grid)"
              />
              
              <rect
                width="100%"
                height="100%"
                fill="none"
                stroke="#ddd"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              
              {/* Временное соединение */}
              <path
                ref={tempConnectionRef}
                className="temp-connection"
                fill="none"
                stroke="#9C27B0"
                strokeWidth="3"
                strokeDasharray="5,5"
                markerEnd="url(#arrowhead)"
              />
              
              {/* Подсказки для точек */}
              {hoveredPoint && (
                <text
                  x={hoveredPoint.type === 'input' ? 
                    getConnectionPoints(blocks.find(b => b.id === hoveredPoint.blockId)!).input.x - 5 :
                    getConnectionPoints(blocks.find(b => b.id === hoveredPoint.blockId)!).output.x + CONNECTION_POINT_SIZE + 5}
                  y={hoveredPoint.type === 'input' ? 
                    getConnectionPoints(blocks.find(b => b.id === hoveredPoint.blockId)!).input.y + CONNECTION_POINT_SIZE / 2 - 15 :
                    getConnectionPoints(blocks.find(b => b.id === hoveredPoint.blockId)!).output.y + CONNECTION_POINT_SIZE / 2 - 15}
                  textAnchor={hoveredPoint.type === 'input' ? 'end' : 'start'}
                  fill="#666"
                  fontSize="12"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {hoveredPoint.type === 'input' ? 'Вход' : 'Выход'}
                </text>
              )}
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
                  <span className="block-connections">
                    Соединений: {connections.filter(c => c.sourceBlockId === editingBlock.id || c.targetBlockId === editingBlock.id).length}
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
                    if (window.confirm('Вы уверены, что хотите удалить этот блок и все связанные соединения?')) {
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