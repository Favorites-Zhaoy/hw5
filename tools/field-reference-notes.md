# 钻井与测井教学案例：专业来源与文献核验备忘录

核验日期：2026-11-02。用途：支持 d1–d5、w1–w5 的专业背景与技术前沿；不作为本网站演示性能的来源。

核验方式：按 nature-academic-search 的多源检索／引文核验流程，使用 Crossref REST 元数据交叉核对出版社、会议官网、作者机构仓储以及数据所有者官方页面。当前会话没有可用的学术 MCP 检索工具，采用技能规定的降级路径。部分出版社正文会返回 403/429；这些条目仅依据可访问的出版社摘要和 Crossref 元数据，不声称已核读其全部实验。

## 使用边界

- 以下近期论文说明领域研究如何使用 AI。网站的基础模型是教学实现，不能写成复现完整复杂论文。
- 合成或编制数据应在数据区说明。浏览器计算的 MAE、F1、误差、提前量和改进幅度应来自同一批演示数据，不能搬用论文的数值。
- 预测、异常分数、像素掩膜分别回答不同问题；异常分数不是具体事故诊断，裂缝像素不等于有效渗透率，低曲线误差也不等于勘探结论正确。
- 训练／归一化／阈值的估计应使用训练部分；跨井比较按井划分，不能把相邻深度点随机分散后宣称跨井泛化。
- 引用年度优先采用正式发表年或明确的在线发表日期。DOI 中的年份不一定是发表年：Hu 等的 DOI 含 2024，正式卷期为 2025；Gao 等的 DOI 含 2025，发表为 2026-04-01；Yin 等 DOI 含 2025，正式卷期为 2026 年 3 月。

## 官方专业背景与示例数据入口

| 来源 | 可支撑的专业主张／适用案例 | 不能推出的结论 |
| --- | --- | --- |
| [SLB：rate of penetration](https://glossary.slb.com/terms/r/rate_of_penetration) | 钻速是钻头破岩、加深井眼的速度，常用 m/h；用于 d1 定义目标量。 | 钻速单独越高就越安全或成本越低。 |
| [SLB：mechanical specific energy](https://glossary.slb.com/en/terms/m/mechanical_specific_energy) | MSE 表示去除单位体积岩石所需机械能；WOB、扭矩、转速与钻速共同参与效率判断。d1 可画“破岩输入—产出”图。 | 单变量加大钻压必然提高整体效率。 |
| [SLB：drilling break](https://glossary.slb.com/en/terms/d/drilling_break) | 钻速突变可能来自地层或孔隙压力变化。d2 应结合多条传感器曲线与工况，而不把突变直接标成事故。 | 任意钻速突增就是井涌。 |
| [SLB：dogleg](https://glossary.slb.com/en/terms/d/dogleg.aspx) | 井眼方向变化可用狗腿度表征，常用 °/30 m；过大曲率关联摩阻、通过性等工程问题。d3 可同时画目标轨迹、实际轨迹、局部曲率。 | 二维教学轨迹控制即完整三维实井控制。 |
| [SLB：twist-off](https://glossary.slb.com/Terms/t/twist-off.aspx) | 钻柱断裂可由疲劳或过大扭矩造成，支持 d4 讲循环载荷与损伤。 | 仅从运行小时就能确定真实剩余寿命。 |
| [SLB：plastic viscosity](https://glossary.slb.com/en/terms/p/plastic_viscosity) | PV 是 Bingham 模型屈服后应力—剪切速率线的斜率，受基液黏度及固相等影响。d5 可用两条流变曲线比较。 | 所有钻井液在全部温压与剪切范围都服从线性 Bingham 模型。 |
| [SLB：yield point](https://glossary.slb.com/en/terms/y/yield_point) | YP 是该模型外推到零剪切速率的截距；可由 300/600 rpm 读数计算，与携岩能力有关。 | 只追求更高 YP 就能得到最佳泥浆；仍须兼顾压耗、密度、滤失等。 |
| [SLB：gamma ray log](https://glossary.slb.com/en/terms/g/gamma_ray_log) | GR 测自然放射性，单位 API；页岩通常较高，但富钾矿物等也能导致高 GR。支持 w1/w4 多曲线综合解释。 | 固定 GR 阈值可在所有盆地唯一确定岩性。 |
| [SLB：density measurement](https://glossary.slb.com/en/Terms/d/density_measurement.aspx) | 密度测井通过伽马散射响应校准体密度；泥饼、井壁不规则会影响读数。支持 w2/w4 的岩石骨架—流体混合与质量控制。 | RHOB 是直接、无误差的孔隙度。 |
| [SLB：neutron porosity](https://glossary.slb.com/en/terms/n/neutron_porosity) | 中子孔隙度主要反映氢响应，受基质、流体、气及黏土影响；可与密度共同约束 w2。 | NPHI 是任何地层的孔隙度真值。 |
| [SLB：natural fracture](https://glossary.slb.com/en/terms/n/natural_fracture) | 裂缝可连接孔隙、影响流动；须区分天然与诱导裂缝。词条含真实井壁裂缝图，可供理解 w3 图形语义。 | 每一条可见裂缝都提高产能，或像素分割已经求得产能。 |
| [SLB：derivative logs](https://glossary.slb.com/en/terms/d/derivative_logs) | 深度方向的导数表达曲线变化；井壁不规则会影响密度测量。支持 w1 的变化窗口，以及 w5 的异常／缺测识别。 | 曲线导数峰值必然是正式地层界面。 |
| [FORCE 2020 官方竞赛入口](https://thinkonward.com/app/c/challenges/force-well-logs/overview) | 真实多井岩性分类资料，98 口训练井、10 口公开测试井；GR/深度保证有值，其他曲线可能缺失。w1/w4/w5 可据此理解多曲线、缺测和跨井问题。 | 所有标签均为岩心直接测定，或所有曲线完整无缺。 |
| [挪威监管机构：FORCE 技术总结](https://www.sodir.no/4ace9a/globalassets/2-force/2020/seminars/contest-machine-learning/technical_retrospective_force-2020-lithofacies-competition.pdf) | 评估采用独立井与地质误判惩罚，支持解释“不同误判代价不同”。 | 一个总准确率足以说明全部地质类别表现。 |
| [挪威监管机构：FORCE 地质总结](https://www.sodir.no/4aca11/globalassets/2-force/2020/seminars/contest-machine-learning/blog-post-litho-facies-competition-geological-summary.pdf) | 岩性解释存在类别模糊与稀少类别问题。 | 解释标签完全没有不确定性。 |
| [Equinor 官方数据共享](https://www.equinor.com/energy/data-sharing) | 官方入口包括 Volve 地下资料和其他测井数据；当前平台通过 Databricks Marketplace 提供。可作为进一步真实数据扩展方向。 | 本网站编制数据自动成为 Volve 数据，或已获得所有图像的任意再发布许可。 |

注意：SLB 的 [stick/slip](https://glossary.slb.com/en/terms/s/stick_and_slip) 词条讲的是测井工具粘滑造成深度错位，不能直接拿来支撑钻柱扭转粘滑原理。

## 钻井：近期原始研究

### d1 钻速与参数优化

1. **Peng, Chi; Zhang, Hong-Lin; Fu, Jian-Hong; Su, Yu; Li, Qing-Feng; Yue, Tian-Qi (2025).** *A novel drilling parameter optimization method based on big data of drilling.* Petroleum Science 22(4), 1596–1610. [DOI: 10.1016/j.petsci.2025.03.002](https://doi.org/10.1016/j.petsci.2025.03.002).
   - 支撑：钻井数据预处理，利用声波／GR／密度等划分地层特征，学习钻速，再优化钻压、转速、泵压与排量。
   - 本课对应：MLP 学“工况及参数→钻速”，再在约束范围比较候选参数。不能声称复现论文完整建模、地层聚类或现场收益。

2. **Chen, Xuyue; Wang, Rong; Yang, Jin; Gao, Deli; Li, Gengchen; Li, Pengbo (2025).** *A new intelligent optimization method for drilling parameters of extended reach wells based on mechanical specific energy and machine learning.* Petroleum Research 10(3), 485–500. [DOI: 10.1016/j.ptlrs.2025.03.002](https://doi.org/10.1016/j.ptlrs.2025.03.002).
   - 支撑：机器学习钻速预测与 MSE、单位进尺成本共同构成多目标优化，而不是单追钻速。
   - 限制：原研究使用集成回归与 NSGA-II，本课基础 MLP／枚举搜索不是其全部方法；原文收益不能用于本课数据。

### d2 多传感器异常预警

3. **Altindal, Mehmet Cagri; Nivlet, Philippe; Tabib, Mandar; Rasheed, Adil; Kristiansen, Tron Golder; Khosravanian, Rasool (2024).** *Anomaly detection in multivariate time series of drilling data.* Geoenergy Science and Engineering 237, 212778. [DOI: 10.1016/j.geoen.2024.212778](https://doi.org/10.1016/j.geoen.2024.212778).
   - 支撑：真实海上钻井多变量时序，对照 PCA、Isolation Forest、LSTM-AE；重建误差可作为异常分数。本课 PCA 正常窗口重建有直接基础。
   - 限制：这是 2024 年方法基础，不能叫 2026 最新论文；本课编制异常不是原研究事件标签，分数也不直接给出事故原因。

4. **Hu, Wenkai; Hu, Bin; Li, Yupeng; Zhang, Peng; Gopaluni, R. Bhushan; Cao, Weihua (2025).** *Anomaly detection for drilling tools based on operating mode recognition and interval-augmented Mahalanobis distance.* Control Engineering Practice 156, 106212. [DOI: 10.1016/j.conengprac.2024.106212](https://doi.org/10.1016/j.conengprac.2024.106212).
   - 支撑：正常工况切换与故障容易混淆；先辨工况，再用统计距离与阈值检测偏离。
   - 限制：原算法不是 PCA；引用它说明工况意识与多变量监测方向，不将其误写成本课实现。

### d3 轨迹控制

5. **Xu, Jiamin; Demirer, Nazli; Pho, Vy; Tian, Kaixiao; Zhang, He; Bhaidasna, Ketan; Darbe, Robert; Chen, Dongmei (2025).** *Real time multi-inputs multi-outputs economic model predictive control for directional drilling based on fast modeling and sensor fusion.* Journal of Process Control 156, 103577. [DOI: 10.1016/j.jprocont.2025.103577](https://doi.org/10.1016/j.jprocont.2025.103577).
   - 支撑：响应模型、状态估计、传感器融合与经济 MPC 协调多输入／多输出，说明“预测若干步再选动作”的逻辑。
   - 限制：本课岭回归学习工具响应＋滚动优化是基础代理；二维示意不能当成完整井下传感器融合或实井控制器。

6. **Zhao, Yi; Zhu, Dan-Dan; Wang, Fei; Dai, Xin-Ping; Jiao, Hui-Shen; Zhou, Zi-Jie (2025).** *An intelligent drilling guide algorithm design framework based on highly interactive learning mechanism.* Petroleum Science 22(8), 3333–3343. [DOI: 10.1016/j.petsci.2025.05.019](https://doi.org/10.1016/j.petsci.2025.05.019).
   - 支撑：离线学习、在线交互和作业后迁移的智能导向研究方向。
   - 限制：该研究包含交互／强化学习，本课岭回归不应称为强化学习。

### d4 钻具健康与剩余寿命

7. **Belov, Dmitry; Wang, Yaou; Chen, Wei; Gilliam, Jennifer (2025-10-26).** *Real-Time Fatigue Risk Assessment of BHA Connectors Using Combined Physics and Data-Driven Approach.* Annual Conference of the PHM Society 17(1). [DOI: 10.36001/phmconf.2025.v17i1.4364](https://doi.org/10.36001/phmconf.2025.v17i1.4364). [会议原文](https://papers.phmsociety.org/index.php/phmconf/article/view/4364).
   - 支撑：用传感器或 ML 估计井下转速及弯矩，结合连接件 S–N 曲线累积损伤并更新 RUL，跨作业追踪组件。
   - 本课对应：同样运行时间下，负荷与循环不同，寿命会不同；窗口特征比单一使用小时更有信息。
   - 限制：本课 MLP 的合成 RUL 不是经实井验证的维修时刻，也没有复现其物理—机器学习生产平台。

8. **Gao, XiaoRong; Wu, XinYa; Li, Qi; Wang, Liupeng; Zhu, ZhongAo; Qu, FengTao (2026-04-01).** *Research on the drilling pipe health monitoring and intelligent life prediction management platform.* Scientific Reports 16, 10981. [DOI: 10.1038/s41598-025-19808-8](https://doi.org/10.1038/s41598-025-19808-8).
   - 支撑：使用史追踪、循环载荷、疲劳模型、监测资料与数据驱动寿命管理的组合。
   - 限制：原文未充分展开具体 ML 架构，不能引用为“采用与本课相同 MLP”的证据；其专有数据和误差不可挪用。

### d5 钻井液性能与调节

9. **Davoodi, Shadfar; Ba Geri, Mohammed; Wood, David A.; Al-Shargabi, Mohammed; Mehrad, Mohammad; Soleimanian, Alireza (2025).** *Predicting water-based drilling fluid filtrate volume in close to real time from routine fluid property measurements.* Petroleum 11(2), 174–187. [DOI: 10.1016/j.petlm.2025.03.002](https://doi.org/10.1016/j.petlm.2025.03.002). [出版社摘要](https://www.sciencedirect.com/science/article/pii/S2405656125000173).
   - 支撑：14 口井 1186 条密度、黏度、固相记录，比较 RBFNN、GRNN、MLP、CNN、GPR 预测滤失量，说明容易获得的测量可以作性能代理。
   - 限制：最优模型、误差仅针对原研究数据；本课 MLP 后接剂量搜索是教学扩展，原研究没有证明该加药闭环。

10. **Xie, Gang; Xu, Xiangyang; Wang, Ruolan; Lu, Qi; Jing, Yujuan; Lei, Min (2026).** *A machine learning model for HTHP shear-stress prediction of oil-based drilling fluid using polynomial-corrected RBF-CRM.* Petroleum Research. [DOI: 10.1016/j.ptlrs.2026.05.002](https://doi.org/10.1016/j.ptlrs.2026.05.002). [出版社摘要](https://www.sciencedirect.com/science/article/pii/S2096249526000566).
   - 支撑：实验温压与剪切应力数据驱动的非线性拟合；可视化温度、压力、密度与流变关系。
   - 限制：RBF-CRM 不是本课 MLP；实验限于指定配方、三类密度，外推到其他体系或现场要另外验证。

11. **Jing, Yujuan; Xiao, Zhou; Wang, Ruolan; Fan, Jin; Yang, Jie; Xiao, Fengfeng; Luo, Yufeng; He, Tao; Wang, Lan; Zhou, Wei; Xie, Gang; Lu, Qi (2026-10-11).** *Neural Network-Based Prediction Model for High Temperature and High Pressure Rheological Parameters of Water-Based Drilling Fluids.* Processes 14(20), 3255. [DOI: 10.3390/pr14203255](https://doi.org/10.3390/pr14203255).
   - 备用：Crossref 与出版社检索摘要已核对，讨论固定配方水基液温压—剪切应力 NN 预测。完整正文请求返回 429，故不据此进一步描述层数、训练细节或现场性能。

## 测井：近期原始研究

### w1 地层分段／界面识别

12. **Yang, Jinghua; Gong, Bin; Huang, Hu; Zhao, Heng; Wu, Haoqiang; Liu, Chen; Zhang, Shifan; Li, Hui (2025).** *A Deep-learning based Model with Intra- and Inter-Well Constraints for Intelligent Identification of Stratigraphic Layers.* Energy and AI 21, 100546. [DOI: 10.1016/j.egyai.2025.100546](https://doi.org/10.1016/j.egyai.2025.100546).
   - 支撑：MLP、PCA 及井内／井间地层一致性约束，结合深度、GR、岩性等学习分层；很适合本课解释多曲线、窗口和连续段结果。
   - 限制：正式地层划分有井间约束与区域知识，不能把任意曲线拐点都称地层界面；原数据保密。

13. **Huang, Junjie; Li, Quanhou (2026).** *Lithology interpretation from well-log sequences using a depth-aware attention deep learning model.* Journal of Geophysical Prospecting 2(4), 389–400. [DOI: 10.1016/j.jgp.2026.04.001](https://doi.org/10.1016/j.jgp.2026.04.001). [出版社摘要](https://www.sciencedirect.com/science/article/pii/S3117651826000517).
   - 支撑：薄层边界、井间差异与深度序列上下文的重要性；研究使用 1D ResNet-18 与深度注意力 Bi-LSTM。
   - 限制：本课窗口分类器不具备该复杂结构；应称基础演示，不宣传为其复现。

### w2 孔隙度／储层参数回归

14. **He, Yawen; Zhang, Hongjun; Wu, Zhiyu; Zhang, Hongbo; Zhang, Xin; Zhuo, Xiaojing; Song, Xiaoli; Dai, Sha; Dang, Wei (2025-04-16).** *Porosity prediction of tight reservoir rock using well logging data and machine learning.* Scientific Reports 15, 13124. [DOI: 10.1038/s41598-025-95578-7](https://doi.org/10.1038/s41598-025-95578-7).
   - 支撑：用测井响应学习非线性孔隙度映射，并依赖岩心等参考量标定。
   - 限制：研究优选 PSO-GBDT，不是 MLP；它支持多曲线回归方向，而不是本课网络架构或误差值。

15. **Mehrabi, Amirreza; Mahzad, Matin; Bagheri, Majid; Nabi Bidhendi, Majid (2026-05-28).** *Dual-attention residual U-Net with Huber loss for robust and efficient porosity prediction from well logs.* Scientific Reports 16, 24424. [DOI: 10.1038/s41598-026-55558-x](https://doi.org/10.1038/s41598-026-55558-x).
   - 支撑：多曲线与深度窗口共同用于连续参数预测，损失函数可减轻异常值影响。
   - 限制：本课 MLP 不应称注意力 U-Net；孔隙度回归适合 MAE／RMSE，不能随意称“准确率”。

### w3 成像裂缝分割

16. **Molossi, Attilio; Cecchetti, Emilio; Bruna, Pierre-Olivier; Pipan, Michele (2025-09-02).** *Deep learning-assisted borehole image analysis for enhanced geothermal reservoir evaluation: a case study in the West Netherlands Basin.* Geoenergy 3(1), geoenergy2025-009. [DOI: 10.1144/geoenergy2025-009](https://doi.org/10.1144/geoenergy2025-009). [作者机构摘要与全文](https://repository.tudelft.nl/record/uuid%3Aeafcebfc-717e-4025-9df3-e5cf18117857).
   - 支撑：FMI 井壁图使用 U-Net（PickNet）分割与 FitNet 特征提取；从合成图适配实际井壁图，说明 CNN 学局部形态与连续纹理的作用。
   - 限制：地热场景与本课油气示意不同；本课浅层 CNN 不等于完整 PickNet/FitNet。分割结果也不是裂缝渗透率或产能。

17. **Wang, Meng; Zhou, Quan; Yin, Lu; Dong, Yu (2025-08-28).** *Automatic detection and classification of igneous rock fractures from imaging logging using K-mean algorithm and DNN.* Frontiers in Earth Science 13, 1640215. [DOI: 10.3389/feart.2025.1640215](https://doi.org/10.3389/feart.2025.1640215).
   - 支撑：成像测井裂缝的自动检测／分类是当前 AI 研究任务，可将原图、掩膜、叠加结果并排呈现。
   - 限制：原文 K-means＋DNN 不是本课浅层 CNN；不要把检测与分类两类任务混为一张图的“准确率”。

### w4 多曲线岩性分类

18. **Pang, Qingwei; Chen, Chenglizhao; Li, Wenhao; Pang, Shanchen (2025).** *Multi-domain masked reconstruction self-supervised learning for lithology identification using well-logging data.* Knowledge-Based Systems 323, 113843. [DOI: 10.1016/j.knosys.2025.113843](https://doi.org/10.1016/j.knosys.2025.113843).
   - 支撑：时间／频率域、掩码重建与自监督研究旨在利用未标注曲线；多通道比单 GR 阈值含更多信息。
   - 限制：基础监督 MLP 不等于该多域自监督框架。不能因为用了多曲线就宣称已经消除跨井差异。

19. **Yin, Jianguo; Zhang, Shuai; Wu, Zhixiong; Pang, Shouji; Wang, Rui (2026).** *Attention-based CNN for lithological identification from logging curves: A case study in the Qaidam Basin, China.* Expert Systems with Applications. [DOI: 10.1016/j.eswa.2025.129740](https://doi.org/10.1016/j.eswa.2025.129740).
   - 支撑：多条测井曲线的联合响应与局部深度模式可用于岩性识别；原研究为 CNN 与注意力。
   - 限制：Crossref 正式卷期是 2026 年 3 月。网站 MLP 是更基础的方法，不能称复制此 CNN。

### w5 曲线缺失修复

20. **Haritha, D.; Satyavani, N.; Ramesh, A. (2025).** *Generation of missing well log data with deep learning: CNN-Bi-LSTM approach.* Journal of Applied Geophysics, 105628. [DOI: 10.1016/j.jappgeo.2025.105628](https://doi.org/10.1016/j.jappgeo.2025.105628).
   - 支撑：其他曲线及深度上下文可用于声波等缺失曲线预测，传统插值与多曲线重建回答的信息条件不同。
   - 限制：本课去噪自编码器不是 CNN-Bi-LSTM。人为遮掉已知数据可验证恢复误差，不能拿本来未知的缺失值作真值。

21. **Park, Jaesung; Jeong, Jina; Holden, Eun-Jung (2026).** *Deep-learning-based hybrid model with iterative lithology constraints for the enhanced prediction of missing well-logs.* Computers & Geosciences 209, 106106. [DOI: 10.1016/j.cageo.2026.106106](https://doi.org/10.1016/j.cageo.2026.106106).
   - 支撑：Volve 多井、多曲线资料使用条件变分自编码器与 LSTM 岩性约束，说明跨曲线关联和地质上下文能帮助重建。
   - 限制：本课普通去噪自编码器没有条件变分与迭代岩性反馈结构；修复曲线是估计，不是新增实测。

## 基础算法来源（不标成领域最新论文）

- **Rumelhart, David E.; Hinton, Geoffrey E.; Williams, Ronald J. (1986).** *Learning representations by back-propagating errors.* Nature 323, 533–536. [DOI: 10.1038/323533a0](https://doi.org/10.1038/323533a0)。Crossref 核对元数据；可支持多层网络经误差反向传播调整权重的基础原理，不能独立证明石油场景效果。
- **Vincent, Pascal; Larochelle, Hugo; Bengio, Yoshua; Manzagol, Pierre-Antoine (2008).** *Extracting and composing robust features with denoising autoencoders.* ICML '08. [DOI: 10.1145/1390156.1390294](https://doi.org/10.1145/1390156.1390294)。Crossref 核对元数据；支持破坏输入、恢复目标的训练思想，不保证任意长度缺失段可准确恢复。
- **Ronneberger, Olaf; Fischer, Philipp; Brox, Thomas (2015).** *U-Net: Convolutional Networks for Biomedical Image Segmentation.* [arXiv:1505.04597](https://arxiv.org/abs/1505.04597)。原论文为生物医学分割，支撑上下文获取与定位结合的结构思想；测井适用性应由上列领域论文说明，不可把医学挑战赛性能移用。

## 页面表达建议

- d1：同一工况散点／响应面＋候选参数落点；叠加可行域，显示“预测高”与“满足约束”都重要。
- d2：同步多曲线、正常窗口重建、异常分数三层共用时间轴；普通阈值和联合异常同时标记，工况切换不要自动当事故。
- d3：目标／传统／滚动优化轨迹共用坐标；转向动作、工具响应与狗腿度相互关联。
- d4：相同使用时长下的不同载荷史→累积损伤／RUL曲线；明确纵轴是教学模型估计。
- d5：PV/YP/滤失的目标区间与预测点；比较加量方案时同时展示成本或约束，避免只有“越大越好”。
- w1：多曲线共用深度轴＋分段边界＋连续层段条，解释为什么局部波动和持续段落要区分。
- w2：骨架／孔隙示意→密度/中子响应→孔隙度估计；传统公式和多曲线回归共用参考曲线。
- w3：展开井壁图→局部纹理响应→逐像素概率→裂缝掩膜叠加；保留泥饼／条带等干扰，展示学习形态为何比单亮度阈值更有信息。
- w4：多曲线交会／特征组合→类别概率→沿深度岩性柱；以混淆矩阵或每类表现补充总分。
- w5：同一遮挡段的线性插值与多曲线重建叠加；保留其他通道，显示“为何有依据”，已知真值只在对照区域出现。

以上绘图仅为教学表达建议，不是引用论文中的效果结论。
