# SillyTavern 订阅系统使用说明

## 概述

本系统为SillyTavern添加了用户注册和订阅续费功能，通过邀请码机制控制用户访问权限。邀请码单独存储在配置文件中，便于管理。

## 功能特性

### 1. 用户注册
- 新用户需要有效的注册邀请码才能注册
- 注册成功后自动获得30天使用权限
- 支持用户名、显示名称、密码设置

### 2. 订阅续费
- 现有用户可以使用续费邀请码延长订阅时间
- 每次续费延长30天
- 支持在订阅到期前续费（时间累加）

### 3. 订阅管理
- 管理员不受订阅限制
- 订阅过期用户无法登录系统
- 支持订阅状态查询

### 4. 邀请码管理
- 邀请码单独存储在 `default/invitation-codes.yaml` 文件中
- 支持通过管理工具或API管理邀请码
- 提供邀请码生成、添加、删除功能

## 配置说明

### 配置文件位置

#### 主配置文件
`default/config.yaml`

#### 邀请码配置文件
`default/invitation-codes.yaml`

### 主配置文件新增项

```yaml
# -- SUBSCRIPTION CONFIGURATION --
# 默认订阅时长（毫秒，30天）
defaultSubscriptionDuration: 2592000000
```

### 邀请码配置文件

```yaml
# SillyTavern 邀请码配置文件
# 此文件用于存储注册和续费邀请码

# 注册邀请码列表
# 新用户需要使用这些邀请码才能注册账户
registrationCodes:
  - "REGISTER-CODE-1"
  - "REGISTER-CODE-2"
  - "REGISTER-CODE-3"

# 续费邀请码列表
# 现有用户需要使用这些邀请码来续费订阅
renewalCodes:
  - "RENEW-CODE-1"
  - "RENEW-CODE-2"
  - "RENEW-CODE-3"
```

## 使用方法

### 1. 管理员操作

#### 使用管理工具
```bash
node manage-codes.js
```

管理工具提供以下功能：
- 查看当前邀请码
- 添加注册/续费邀请码
- 删除注册/续费邀请码
- 生成随机邀请码

#### 使用API管理邀请码

获取邀请码列表：
```
GET /api/admin/invitation-codes
```

添加注册邀请码：
```
POST /api/admin/invitation-codes/registration
Content-Type: application/json

{
  "code": "NEW-REGISTER-CODE"
}
```

添加续费邀请码：
```
POST /api/admin/invitation-codes/renewal
Content-Type: application/json

{
  "code": "NEW-RENEW-CODE"
}
```

删除注册邀请码：
```
DELETE /api/admin/invitation-codes/registration/CODE-TO-DELETE
```

删除续费邀请码：
```
DELETE /api/admin/invitation-codes/renewal/CODE-TO-DELETE
```

生成随机邀请码：
```
POST /api/admin/invitation-codes/generate
Content-Type: application/json

{
  "type": "registration",  // 或 "renewal"
  "prefix": "REGISTER"     // 可选
}
```

#### 直接编辑配置文件
直接编辑 `default/invitation-codes.yaml` 文件来管理邀请码。

### 2. 用户操作

#### 注册新账户
1. 访问登录页面
2. 点击"注册"链接
3. 填写用户信息：
   - 用户名（英文、数字、连字符）
   - 显示名称
   - 密码
   - 确认密码
   - 注册邀请码
4. 点击"注册"按钮

#### 续费订阅
1. 访问登录页面
2. 点击"续费"链接
3. 填写信息：
   - 用户名
   - 续费邀请码
4. 点击"续费"按钮

## API接口

### 用户API

#### 注册用户
```
POST /api/users/register
Content-Type: application/json

{
  "handle": "用户名",
  "name": "显示名称",
  "password": "密码",
  "invitationCode": "注册邀请码"
}
```

#### 续费订阅
```
POST /api/users/renew
Content-Type: application/json

{
  "handle": "用户名",
  "invitationCode": "续费邀请码"
}
```

#### 检查订阅状态
```
POST /api/users/check-subscription
Content-Type: application/json

{
  "handle": "用户名"
}
```

### 管理员API

#### 获取邀请码列表
```
GET /api/admin/invitation-codes
```

#### 添加注册邀请码
```
POST /api/admin/invitation-codes/registration
Content-Type: application/json

{
  "code": "邀请码"
}
```

#### 添加续费邀请码
```
POST /api/admin/invitation-codes/renewal
Content-Type: application/json

{
  "code": "邀请码"
}
```

#### 删除注册邀请码
```
DELETE /api/admin/invitation-codes/registration/:code
```

#### 删除续费邀请码
```
DELETE /api/admin/invitation-codes/renewal/:code
```

#### 生成随机邀请码
```
POST /api/admin/invitation-codes/generate
Content-Type: application/json

{
  "type": "registration",  // 或 "renewal"
  "prefix": "REGISTER"     // 可选
}
```

## 数据库结构

### 用户表新增字段
```javascript
{
  // ... 现有字段
  subscriptionExpires: number  // 订阅到期时间戳（可选）
}
```

## 文件结构

```
SillyTavern-Cloud/
├── default/
│   ├── config.yaml              # 主配置文件
│   └── invitation-codes.yaml    # 邀请码配置文件
├── src/
│   ├── invitation-codes.js      # 邀请码管理模块
│   ├── endpoints/
│   │   ├── users-public.js      # 用户公共API
│   │   └── users-admin.js       # 管理员API
│   └── users.js                 # 用户管理模块
├── public/
│   ├── login.html               # 登录页面
│   ├── scripts/
│   │   └── login.js             # 登录页面逻辑
│   └── css/
│       └── login.css            # 登录页面样式
├── manage-codes.js              # 邀请码管理工具
└── SUBSCRIPTION_README.md       # 使用说明文档
```

## 安全考虑

1. **邀请码管理**：定期更换邀请码，避免泄露
2. **密码安全**：使用强密码策略
3. **访问控制**：管理员账户不受订阅限制
4. **日志记录**：所有注册和续费操作都会记录日志
5. **文件权限**：确保邀请码配置文件权限设置正确

## 故障排除

### 常见问题

1. **注册失败**
   - 检查邀请码是否正确
   - 确认用户名格式（只能包含英文、数字、连字符）
   - 检查用户名是否已存在

2. **续费失败**
   - 检查续费邀请码是否正确
   - 确认用户名存在且账户未被禁用

3. **登录失败**
   - 检查订阅是否已过期
   - 确认账户未被禁用

4. **邀请码管理问题**
   - 检查 `default/invitation-codes.yaml` 文件是否存在
   - 确认文件格式正确（YAML格式）
   - 检查文件权限

### 日志查看
查看服务器控制台日志获取详细错误信息。

## 自定义配置

### 修改订阅时长
编辑配置文件中的 `defaultSubscriptionDuration` 值：
- 30天：2592000000ms
- 60天：5184000000ms
- 90天：7776000000ms

### 禁用订阅系统
将 `defaultSubscriptionDuration` 设置为 0 或删除相关配置项。

### 邀请码文件位置
可以通过修改 `src/invitation-codes.js` 中的 `INVITATION_CODES_FILE` 常量来更改邀请码文件位置。

## 更新日志

### v1.1.0
- 邀请码分离存储到独立配置文件
- 添加邀请码管理API
- 改进管理工具功能
- 增强错误处理

### v1.0.0
- 初始版本发布
- 支持用户注册和续费功能
- 添加邀请码管理工具
- 实现订阅状态检查

## 技术支持

如有问题，请查看：
1. 服务器控制台日志
2. 浏览器开发者工具网络请求
3. 配置文件语法是否正确
4. 邀请码文件格式是否正确 