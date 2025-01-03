class SchemaValidator {
  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false
    });
    this.currentSchema = null;
  }

  setSchema(schema) {
    try {
      const validate = this.ajv.compile(schema);
      this.currentSchema = validate;
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: `Schema 无效: ${err.message}` 
      };
    }
  }

  validate(json) {
    if (!this.currentSchema) {
      return {
        valid: false,
        errors: ['未设置 Schema']
      };
    }

    const valid = this.currentSchema(json);
    if (valid) {
      return { valid: true };
    }

    return {
      valid: false,
      errors: this.currentSchema.errors.map(err => ({
        path: err.instancePath,
        message: err.message,
        keyword: err.keyword,
        params: err.params
      }))
    };
  }

  getErrorMessage(error) {
    const path = error.path || '';
    const property = error.params.missingProperty || '';
    
    switch (error.keyword) {
      case 'required':
        return `缺少必需属性: ${property}`;
      case 'type':
        return `${path} 类型错误: 应为 ${error.params.type}`;
      case 'format':
        return `${path} 格式错误: 应为 ${error.params.format}`;
      case 'pattern':
        return `${path} 不匹配模式: ${error.params.pattern}`;
      case 'minimum':
        return `${path} 应大于等于 ${error.params.limit}`;
      case 'maximum':
        return `${path} 应小于等于 ${error.params.limit}`;
      case 'minLength':
        return `${path} 长度应大于等于 ${error.params.limit}`;
      case 'maxLength':
        return `${path} 长度应小于等于 ${error.params.limit}`;
      default:
        return error.message;
    }
  }
} 