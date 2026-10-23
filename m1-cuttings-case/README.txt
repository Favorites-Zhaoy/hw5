M1 岩屑岩性识别 · 0.1.0 流程页面原型

直接打开 demo/index.html 即可预览，无需服务器或联网。
通过主网站“添加案例”选择本文件夹，保持 case.json 与 demo、assets 的相对结构。
本包沿用 firstbreak-pick-case 的标准 page 模式，不修改门户导入协议。

包含：专业背景、四步流程、立体插画交互页面。悬浮突出场景，点击显示解释；支持上一步/下一步、自动讲解、暂停动效及键盘操作。
这是初版流程页面，尚未接入真实岩屑数据、分类模型、识别概率或准确率，不应作为完整算法案例验收。

素材：assets/m1-dioramas.webp 由 OpenAI imagegen 生成，仅作教学插画；生成提示见 ARTWORK-PROMPT.txt。图片不是公开数据集样本，不用于训练。
待核验公开数据：https://zenodo.org/records/5545058 （DOI: 10.5281/zenodo.5545058，CC BY 4.0）
该数据以扫描电镜图像为主，本包未收录数据集原始文件。后续按实际标签、同源样本分组和元数据决定任务设计。
专业背景：https://www.slb.com/resource-library/oilfield-review/defining-series/defining-mud-logging

页面所有标题、说明和按钮均为 HTML 文字。装饰性立体设备来自图片；流动箭头为 SVG 与 CSS 动画。
