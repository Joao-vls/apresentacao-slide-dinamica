import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDragMove, CdkDragEnd } from '@angular/cdk/drag-drop'; 

// ATUALIZADO: Adicionado 'text' aos tipos permitidos
export type DeviceType = 'internet' | 'router' | 'switch' | 'hub' | 'pc' | 'phone' | 'text';

export interface NetworkNode {
  id: string;
  type: DeviceType;
  info: string;
  x: number;
  y: number;
  boxWidth?: number;
  boxHeight?: number;
}

export interface NetworkLink {
  sourceId: string;
  targetId: string;
}

export interface Packet {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}

export interface SavedNetwork {
  id: string;
  name: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
}

@Component({
  selector: 'app-network-simulator',
  standalone: true,
  imports: [CommonModule, CdkDrag],
  templateUrl: './network-simulator.component.html',
  styleUrls: ['./network-simulator.component.css']
})
export class NetworkSimulatorComponent implements OnInit {
  nodes = signal<NetworkNode[]>([
    { id: '1', type: 'internet', info: 'Internet\nExternal IP', x: 400, y: 50 },
    { id: '2', type: 'router', info: 'Router\n192.168.1.1', x: 400, y: 150 },
    { id: '3', type: 'switch', info: 'Switch', x: 400, y: 280 },
    { id: '4', type: 'pc', info: 'PC 1\n192.168.1.101\nMAC: 00:1B:44:11:3A:B7', x: 200, y: 400 },
    { id: '5', type: 'pc', info: 'PC 2\n192.168.1.102', x: 600, y: 400 }
  ]);

  links = signal<NetworkLink[]>([
    { sourceId: '1', targetId: '2' },
    { sourceId: '2', targetId: '3' },
    { sourceId: '3', targetId: '4' },
    { sourceId: '3', targetId: '5' }
  ]);

  activePacket = signal<Packet | null>(null);
  isLinkMode = signal<boolean>(false);
  selectedNodeForLink = signal<string | null>(null);
  
  isRoutingMode = signal<boolean>(false);
  pingRoute = signal<NetworkNode[]>([]);
  isPingRunning = signal<boolean>(false);

  editingNodeId = signal<string | null>(null);
  activeDragPositions = signal<Map<string, {x: number, y: number}>>(new Map());
  savedNetworks = signal<SavedNetwork[]>([]);

  svgLinks = computed(() => {
    const dragPos = this.activeDragPositions();
    const currentNodes = this.nodes();
    
    return this.links().map(link => {
      const source = currentNodes.find(n => n.id === link.sourceId);
      const target = currentNodes.find(n => n.id === link.targetId);
      
      const sourcePos = dragPos.get(link.sourceId) || source;
      const targetPos = dragPos.get(link.targetId) || target;

      return {
        x1: (sourcePos?.x || 0) + 60,
        y1: (sourcePos?.y || 0) + 40,
        x2: (targetPos?.x || 0) + 60,
        y2: (targetPos?.y || 0) + 40
      };
    });
  });

  ngOnInit() {
    this.loadSavedNetworks();
  }

  loadSavedNetworks() {
    const saved = localStorage.getItem('network_schemas');
    if (saved) {
      this.savedNetworks.set(JSON.parse(saved));
    }
  }

  saveCurrentSchema() {
    const name = prompt('Digite um nome para salvar este layout de rede:');
    if (!name || name.trim() === '') return;

    const newSchema: SavedNetwork = {
      id: Date.now().toString(),
      name: name.trim(),
      nodes: this.nodes(),
      links: this.links()
    };

    const updated = [...this.savedNetworks(), newSchema];
    this.savedNetworks.set(updated);
    localStorage.setItem('network_schemas', JSON.stringify(updated));
    alert(`Layout "${newSchema.name}" salvo com sucesso!`);
  }

  loadSchema(event: Event) {
    const select = event.target as HTMLSelectElement;
    const schemaId = select.value;
    
    if (!schemaId) return;

    const schema = this.savedNetworks().find(s => s.id === schemaId);
    if (schema) {
      this.nodes.set(schema.nodes);
      this.links.set(schema.links);
      
      this.activeDragPositions.set(new Map());
      this.isLinkMode.set(false);
      this.isRoutingMode.set(false);
      this.pingRoute.set([]);
      this.editingNodeId.set(null);
    }
    
    select.value = '';
  }

  // ATUALIZADO: Define texto inicial diferente para a caixa de anotação
  addDevice(type: DeviceType) {
    const newId = Math.random().toString(36).substring(2, 9);
    
    let defaultInfo = '';
    if (type === 'text') {
      defaultInfo = ' ';
    } else {
      defaultInfo = `Novo ${type}\n192.168.1.${Math.floor(Math.random() * 100) + 150}`;
    }

    const newNode: NetworkNode = {
      id: newId,
      info: defaultInfo,
      type: type,
      x: 100 + Math.random() * 600,
      y: 100 + Math.random() * 300
    };
    this.nodes.update(n => [...n, newNode]);
  }

  onDragMoved(event: CdkDragMove, node: NetworkNode) {
    const pos = event.source.getFreeDragPosition();
    const newMap = new Map(this.activeDragPositions());
    newMap.set(node.id, pos);
    this.activeDragPositions.set(newMap);
  }

  onDragEnded(event: CdkDragEnd, node: NetworkNode) {
    const pos = event.source.getFreeDragPosition();
    this.nodes.update(ns => ns.map(n => 
      n.id === node.id ? { ...n, x: pos.x, y: pos.y } : n
    ));
    const newMap = new Map(this.activeDragPositions());
    newMap.delete(node.id);
    this.activeDragPositions.set(newMap);
  }

  toggleLinkMode() {
    this.isLinkMode.update(m => !m);
    if (this.isLinkMode()) {
      this.isRoutingMode.set(false);
      this.pingRoute.set([]);
      this.editingNodeId.set(null);
    }
    this.selectedNodeForLink.set(null);
  }

  toggleRoutingMode() {
    this.isRoutingMode.update(m => !m);
    if (this.isRoutingMode()) {
      this.isLinkMode.set(false);
      this.selectedNodeForLink.set(null);
      this.pingRoute.set([]);
      this.editingNodeId.set(null);
    }
  }

  handleNodeClick(node: NetworkNode) {
    if (this.editingNodeId() === node.id) return;

    if (this.isLinkMode()) {
      const currentSelected = this.selectedNodeForLink();
      if (!currentSelected) {
        this.selectedNodeForLink.set(node.id);
      } else {
        if (currentSelected !== node.id) {
          const linkExists = this.links().some(l => 
            (l.sourceId === currentSelected && l.targetId === node.id) ||
            (l.sourceId === node.id && l.targetId === currentSelected)
          );
          
          if (!linkExists) {
            this.links.update(l => [...l, { sourceId: currentSelected, targetId: node.id }]);
          } else {
            this.links.update(l => l.filter(link => 
              !(link.sourceId === currentSelected && link.targetId === node.id) &&
              !(link.sourceId === node.id && link.targetId === currentSelected)
            ));
          }
        }
        this.selectedNodeForLink.set(null);
      }
      return;
    }

    if (this.isRoutingMode() && !this.isPingRunning()) {
      const currentRoute = this.pingRoute();
      if (currentRoute.length > 0) {
        const lastNode = currentRoute[currentRoute.length - 1];
        if (lastNode.id === node.id) return;

        const isConnected = this.links().some(l => 
          (l.sourceId === lastNode.id && l.targetId === node.id) ||
          (l.sourceId === node.id && l.targetId === lastNode.id)
        );

        if (!isConnected) {
          alert('Você só pode enviar o pacote para um dispositivo conectado ao anterior!');
          return;
        }
      }
      this.pingRoute.update(r => [...r, node]);
    }
  }
  
  openInlineEdit(node: NetworkNode) {
    if (this.isLinkMode() || this.isRoutingMode() || this.isPingRunning()) return;
    this.editingNodeId.set(node.id);
  }

  saveInlineEdit(node: NetworkNode, event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const newInfo = textarea.value;
    
    const w = textarea.style.width ? parseInt(textarea.style.width) : node.boxWidth;
    const h = textarea.style.height ? parseInt(textarea.style.height) : node.boxHeight;
    
    this.nodes.update(ns => ns.map(n => 
      n.id === node.id ? { ...n, info: newInfo, boxWidth: w, boxHeight: h } : n
    ));
    
    this.editingNodeId.set(null);
  }

  async runCustomPing() {
    const route = this.pingRoute();
    if (route.length < 2) return;

    this.isPingRunning.set(true);
    this.isRoutingMode.set(false);

    for (let i = 0; i < route.length - 1; i++) {
      const source = route[i];
      const target = route[i + 1];

      this.activePacket.set(null);
      await new Promise(resolve => setTimeout(resolve, 20));

      this.activePacket.set({
        startX: source.x + 60, startY: source.y + 40,
        endX: target.x + 60, endY: target.y + 40,
        active: true
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.activePacket.set(null);
    this.pingRoute.set([]);
    this.isPingRunning.set(false);
  }

  getRouteStep(nodeId: string): number {
    return this.pingRoute().findIndex(n => n.id === nodeId) + 1;
  }

  getIcon(type: DeviceType): string {
    const icons: Record<DeviceType, string> = {
      internet: '☁️', router: '🔘', switch: '🎛️', hub: '🖧', pc: '🖥️', phone: '📱', text: '📝'
    };
    return icons[type];
  }
}