'use strict';
// Choose from the task, input structure and actual available labels.
module.exports={
 m1:{id:'resnet18-classifier',name:'ResNet-18 图像分类',family:'卷积图像分类',input:'带整图岩性标签的RGB照片',output:'每张照片的三类候选',why:'任务是比较照片中的纹理与形态，保留卷积特征提取；样本少，冻结骨干，只拟合分类层。',limit:'整图类别不等于每颗岩屑的岩性，留出组失败也要保留。',stages:['统一裁切的照片','固定ResNet-18','三类分类层','沿井深的候选'],notes:['224×224 RGB','边缘、纹理与形态','用拟合组标签训练','保留照片与得分'],source:'https://arxiv.org/abs/1512.03385'},
 m2:{id:'gru-forecast',name:'GRU 连续气测预测',family:'时序分析 · 预测残差',input:'当前时刻之前最多12分钟的6通道记录',output:'下一分钟通道预测与观测残差',why:'总览将M2划为时序分析。气峰的升降与持续时间都依赖先后顺序；GRU逐分钟传递状态，用过去预测下一分钟，再找偏离预期的变化。',limit:'真实资料没有气测事件标签；预测残差大可能来自作业或测量变化，不能直接解释为油气发现。',stages:['之前的连续记录','GRU顺序传递状态','预测下一分钟','与实际观测比较'],notes:['最多12步×6通道','单向、12维状态','当前观测不入输入','按预测残差筛候选'],source:'https://docs.pytorch.org/docs/stable/generated/torch.nn.GRU.html'},
 m3:{id:'unet',name:'U-Net 像素分割',family:'卷积语义分割',input:'荧光RGB图与逐像素标签',output:'每个像素的目标概率与掩膜',why:'这里需要知道亮区在哪里，而不是只给整张图一个类别。U-Net在提取邻域特征后恢复像素位置，适合区域圈定任务。',limit:'当前标签来自合成生成器，区域面积不直接代表含油饱和度。',stages:['校正后的RGB图','编码与压缩','跳接与解码','逐像素目标区域'],notes:['64×64 RGB','8→16→32通道','补回位置细节','阈值形成二值掩膜'],source:'https://arxiv.org/abs/1505.04597'},
 m4:{id:'lstm-rop',name:'LSTM 工况序列回归',family:'时序分析 · 深度序列回归',input:'按井深排序的最多12条四通道工况记录',output:'当前ROP估计与沿井深的残差变化',why:'总览将M4划为时序分析。钻进响应要放回连续井段中比较；LSTM沿井深读取钻压、转速、扭矩和流量，把前段工况状态带入当前钻速估计。',limit:'深度顺序不等于等间隔时间；超过2 m的缺口断开。跨井回归仍需实测检验，残差不直接命名地层。',stages:['有序工况记录','LSTM传递井段状态','估计当前logROP','还原ROP与残差'],notes:['4通道、最多12条','单向、12维记忆','含当前工况、不含ROP','沿井深寻找变化候选'],source:'https://docs.pytorch.org/docs/stable/generated/torch.nn.LSTM.html'},
 m5:{id:'bigru-fact-template',name:'BiGRU 分类＋字段模板',family:'语句分类 / 有来源的成文',input:'中文原句与独立事实字段',output:'事项类别与有出处的摘要',why:'语句分类要区分否定、转折和前后语境，使用双向GRU；井段与数值由字段抽取和模板处理，不交给分类器自由编写。',limit:'BiGRU只适配当前中文教学语句，模板不会补写缺少证据的地质结论。',stages:['原始中文语句','双向GRU编码','事项类别','字段绑定后成文'],notes:['最多96个字符','两方向各24维','保留错误与低分','数字逐项有来源'],source:'https://arxiv.org/abs/1406.1078'}
};
const domains={m1:'cv',m2:'ts',m3:'cv',m4:'ts',m5:'nlp'};
for(const [id,guide] of Object.entries(module.exports))guide.domain=domains[id];
