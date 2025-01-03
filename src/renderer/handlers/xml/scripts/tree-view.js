class XmlTreeView {
  constructor(container, editor) {
    this.container = container;
    this.editor = editor;
    this.parser = new DOMParser();
    this.selectedNode = null;
  }

  update(xml) {
    try {
      const doc = this.parser.parseFromString(xml, 'text/xml');
      this.container.innerHTML = '';
      this.buildTree(doc.documentElement, this.container, 0);
    } catch (err) {
      console.error('构建树形视图失败:', err);
    }
  }

  buildTree(node, container, level) {
    const treeNode = document.createElement('div');
    treeNode.className = 'tree-node';
    treeNode.dataset.level = level;
    treeNode.dataset.path = this.getXPath(node);

    // 添加展开/折叠控制
    if (node.children.length > 0) {
      const toggle = document.createElement('span');
      toggle.className = 'toggle';
      toggle.onclick = (e) => {
        e.stopPropagation();
        treeNode.classList.toggle('expanded');
        Array.from(treeNode.children)
          .filter(child => child.classList.contains('tree-node'))
          .forEach(child => child.style.display = 
            treeNode.classList.contains('expanded') ? 'block' : 'none');
      };
      treeNode.appendChild(toggle);
    }

    // 添加节点图标
    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = node.children.length > 0 ? '📁' : '📄';
    treeNode.appendChild(icon);

    // 添加节点名称
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = node.nodeName;
    treeNode.appendChild(label);

    // 添加属性
    if (node.attributes.length > 0) {
      const attrs = document.createElement('span');
      attrs.className = 'attributes';
      const attrStr = Array.from(node.attributes)
        .map(attr => `${attr.name}="${attr.value}"`)
        .join(' ');
      attrs.textContent = ` [${attrStr}]`;
      treeNode.appendChild(attrs);
    }

    // 添加文本内容
    const textContent = this.getDirectTextContent(node);
    if (textContent) {
      const text = document.createElement('span');
      text.className = 'text';
      text.textContent = `: "${textContent}"`;
      treeNode.appendChild(text);
    }

    // 点击处理
    treeNode.onclick = (e) => {
      e.stopPropagation();
      this.selectNode(treeNode);
      this.scrollToNode(node);
    };

    container.appendChild(treeNode);

    // 递归处理子节点
    if (node.children.length > 0) {
      Array.from(node.children).forEach(child => {
        this.buildTree(child, treeNode, level + 1);
      });
    }
  }

  getDirectTextContent(node) {
    let text = '';
    for (let child of node.childNodes) {
      if (child.nodeType === 3) { // Text node
        text += child.textContent.trim();
      }
    }
    return text;
  }

  getXPath(node) {
    const parts = [];
    while (node && node.nodeType === 1) {
      let idx = 1;
      for (let sibling = node.previousSibling; sibling; sibling = sibling.previousSibling) {
        if (sibling.nodeType === 1 && sibling.nodeName === node.nodeName) {
          idx++;
        }
      }
      parts.unshift(`${node.nodeName}[${idx}]`);
      node = node.parentNode;
    }
    return '/' + parts.join('/');
  }

  selectNode(treeNode) {
    if (this.selectedNode) {
      this.selectedNode.classList.remove('selected');
    }
    treeNode.classList.add('selected');
    this.selectedNode = treeNode;
  }

  scrollToNode(node) {
    // 在编辑器中查找并滚动到对应的节点
    const xml = this.editor.value;
    const lines = xml.split('\n');
    const nodeStr = node.outerHTML;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(nodeStr)) {
        this.editor.scrollTop = i * parseInt(getComputedStyle(this.editor).lineHeight);
        break;
      }
    }
  }

  toggleVisibility() {
    this.container.classList.toggle('visible');
  }
} 