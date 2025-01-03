class XmlParser {
  constructor() {
    this.parser = new DOMParser();
  }

  parse(xml) {
    const doc = this.parser.parseFromString(xml, 'text/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        valid: false,
        error: parseError.textContent
      };
    }
    return { valid: true };
  }

  format(xml) {
    try {
      return prettier.format(xml, {
        parser: 'xml',
        plugins: [prettierPlugins.xml],
        xmlWhitespaceSensitivity: 'ignore'
      });
    } catch (err) {
      throw new Error(`格式化失败: ${err.message}`);
    }
  }

  minify(xml) {
    try {
      const doc = this.parser.parseFromString(xml, 'text/xml');
      const serializer = new XMLSerializer();
      return serializer.serializeToString(doc);
    } catch (err) {
      throw new Error(`压缩失败: ${err.message}`);
    }
  }

  highlightXml(code) {
    return code
      .replace(/(<\/?[^>]+>)/g, '<span class="token tag">$1</span>')
      .replace(/(\s+[^\s=]+)=/g, '<span class="token attr-name">$1</span>=')
      .replace(/="([^"]*?)"/g, '="<span class="token attr-value">$1</span>"')
      .replace(/<!--[\s\S]*?-->/g, '<span class="token comment">$&</span>')
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '<span class="token cdata">$&</span>')
      .replace(/<!DOCTYPE[^>]+>/g, '<span class="token doctype">$&</span>')
      .replace(/<\?xml[^>]+\?>/g, '<span class="token prolog">$&</span>');
  }
} 