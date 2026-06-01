# 知識0からのプログラミング学習 ～Twitter（ツイッター）から株価予測～｜アドルフサックス
- **Source URL**: https://note.com/sherrysherry3416/n/nacb616275327
- **Score**: 35
- **AI Summary**:
  - Twitter APIとMeCabを用いてトヨタ自動車のツイートを取得し感情分析を行う手順を解説。
  - 感情極性実体辞書を用いてツイートの感情平均値を算出し、時系列データに整形・補完している。
  - 取得した感情データと株価データを組み合わせ、ロジスティック回帰などのモデルで予測を行う。
- **Read Now Reason**: API経由でのテキスト取得からMeCabによる形態素解析、感情数値化（PN値）の流れを追うための簡易的なコード実装例として参考になる。
- **Suggested Tags**: #NLP, #Sentiment-Analysis, #Python-Intro
- **Processed Date**: 2026/6/1

---

## 本文
1 はじめに日々投資について考えている中年サラリーマンです。最近、投資においてAI(人工知能)を活用した株価予測、銘柄選定、自動売買といったものを目にします。一昔前は投資の情報収集には会社四季報やアナリストレポートなどを重宝していましたが、そんなアナログな情報収集では太刀打ちできない時代になってきたのかもしれませんね。ただ、「AI」と一口に言っても具体的に何をどう分析しているのか理解できないことには、利用するかどうかの判断もできません。そこで、まずはAI開発に必須と言われるプログラミング言語「Python」を自らが学び、AIへの理解を深めてみることにしました。このブログではPythonを学習する過程で作成した「トヨタ自動車の株価をツイッターのツイートから予測するモデル」を紹介しています。2 本記事の概要・Twitterからトヨタ自動車株式会社(@TOYOTA_PR)のツイートを取得・Mecabによる感情分析・Investor.comから7203トヨタ自動車の株価データを取得・感情分析結果と株価データからロジスティック回帰、SVN、ランダムフォ　　　　レストのモデルで予測3 実行環境google colaboratorypython34 作成したコードの説明google colaboratoryにMeCabをインストールMeCabはオープンソースの形態素解析エンジンです。形態素解析とは対象となる言語の文法や単語の品詞情報をもとに、文章を形態素(単語が意味を持つ最小の単位)に分解することを指します。例えば、「すもももももももものうち」をMeCabで解析すると、「すもも  も  もも  も  もも  の  うち」に分解されます。今回はトヨタ自動車のツイートを分析するうえで必要になります。!apt install aptitude
!aptitude install mecab libmecab-dev mecab-ipadic-utf8 git make curl xz-utils file -y
!pip install mecab-python3==0.7必要なライブラリをインポートライブラリとは、ブログラムを書くときに汎用的に使用する便利な機能を集めたものです。決まった処理をしてくれる「型」のようなもので、目的に応じて必要なものを利用することで作業効率が向上します。英語で図書館を指す「Library」が語源だそうです。
import tweepy
import csv
import pandas as pd
import pandas as pd
import MeCab
import re
import numpy as np
from io import StringIO
import urllib
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC     ツイッターAPIキーとトークンを入力ツイッターからツイート情報を取得するためにはAPIキー、トークンが必要です。APIキー、トークンはツイッターの英文サイト上から申請する必要があり、ツイート情報の利用目的などを文章で記述しなければならないため、やや面倒でした。とはいえ、APIキー、トークンの取得方法を紹介したサイトがたくさんありますので参考にしつつ、翻訳機能を使えば英語が不得手な私でも問題なく取得できました。
consumer_key = "**************"         
consumer_secret = "***********************" 
access_key = "******************************"             
access_secret = "***********************************"  トヨタ自動車のツイート情報を取得トヨタ自動車のツイッター公式アカウント「@TOYOTA_PR」からツイートを取得します。auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_key, access_secret)
api = tweepy.API(auth)

tweet_data = []
tweets = tweepy.Cursor(api.user_timeline,screen_name = "@TOYOTA_PR",exclude_replies = True)
for tweet in tweets.items():
   tweet_data.append([tweet.id,tweet.created_at,tweet.text.replace('\n',''),tweet.favorite_count,tweet.retweet_count])
tweet_data取得した情報をCSVに出力短時間にツイート情報の取得を繰り返し行うと、ツイッターから制限がかかってしまう可能性があるらしいので、取得した情報をgoogle colaboratoryにCSVデータとして保存しておきます。with open('tweets.csv', 'w',newline='',encoding='utf-8') as f:
   writer = csv.writer(f, lineterminator='\n')
   writer.writerow(["id", "created_at", "text", "favorite_count", "retweet_count"])
   writer.writerows(tweet_data)
pass取得した情報をCVSファイルから読み込むgoogle colaboratoryに保存してあるツイート情報を再度読み込みます。ここで、created_atのカラム名をdateに変更したうえで、dateをインデックスにしてテキストだけを抽出し、dateの昇順に並び替えます。要するに不要なデータを削除して、日付とツイート内容だけに整理します。df_tweets = pd.read_csv('/content/tweets.csv', header=0)
df_tweets = df_tweets[['created_at', 'text']].sort_index(ascending=True)辞書のデータフレームを作成pn_df = pd.read_csv('/content/6050_stock_price_prediction_data/pn_ja.csv', encoding='utf-8', names=('Word','Reading','POS', 'PN'))ワードリストとＰＮ値のリストを統合し辞書型にするPN値とは、単語が持つイメージを良い(ポジティブ)、悪い(ネガティブ)に応じて 1～-1に数値化したものです。例えば「優れる」「良い」には1に近いが割り当てられておりポジティブな単語、「死ぬ」「悪い」には-1に近い値が割り当てられておりネガティブな単語となります。word_list = list(pn_df['Word'])
pn_list   = list(pn_df['PN'])
pn_dict   = dict(zip(word_list, pn_list))MeCabインスタンスの作成引数を無指定にしてIPA辞書にします。m = MeCab.Tagger('') テキストを形態素解析し辞書のリストを返す形態素解析結果（改行を含む文字列として得られる）を1行（1語）ごとに分けてリストにします。def get_diclist(text):
   text = str(text).lower()
   parsed = m.parse(text)      
   lines = parsed.split('\n')  
   lines = lines[0:-2]         
   diclist = []
   for word in lines:
       l = re.split('\t|,',word)  
       d = {'Surface':l[0], 'POS1':l[1], 'POS2':l[2], 'BaseForm':l[7]}
       diclist.append(d)
   return(diclist)   PN値を集計ツイートに含まれる形態素が辞書に含まれている場合は、そのワードに対応するpn値とし、辞書に無い場合は0とします。def add_pnvalue(diclist_old):
   diclist_new = []
   for word in diclist_old:
       base = word['BaseForm']        
       if base in pn_dict:
           pn = float(pn_dict[base]) 
       else:
           pn = 'notfound'            
       word['PN'] = pn
       diclist_new.append(word)
   return(diclist_new)各ツイートのPN平均値を求める len()で個数を確認。1個以上なら平均値を計算し、そうでない場合は0とします。def get_mean(dictlist):
   pn_list = []
   for word in dictlist:
       pn = word['PN']
       if pn!='notfound':
           pn_list.append(pn)
   if len(pn_list)>0:
       pnmean = np.mean(pn_list)
   else:
       pnmean=0
   return pnmeanツイートごとに集計したPN値を標準偏差のデータに整形するmeans_list = []
for tweet in df_tweets['text']:
   dl_old = get_diclist(tweet)
   dl_new = add_pnvalue(dl_old)
   pnmean = get_mean(dl_new)
   means_list.append(pnmean)
means_list = np.copy(means_list)
x_std = (means_list - means_list.mean()) / means_list.std()

df_tweets['pn'] = x_std
df_tweets = df_tweets.drop('text', axis=1)
df_tweets.index = pd.to_datetime(df_tweets.index)1日ごとにPN値を平均でまとめて、欠損値は線形補間を行う同じ日に複数のツイートがある場合は、ツイートごとのPN値の平均をその日のPN値とします。また、ツイートが無い日はPN値が欠けてしまうので、前後の値から推測して補間します。
df_tweets =  df_tweets.resample('D').mean().interpolate()トヨタ自動車の株価データを取得7203トヨタ自動車の株価のヒストリカルデータをinvesting.comのサイト(https://jp.investing.com/equities/toyota-motor-corporation-historical-data)から10年分ダウンロードし、グーグルドライブに保存。GoogleColaboratoryからグーグルドライブを参照できるように設定します(マウントすると言うらしいです)。そして株価のヒストリカルデータを読み込みます。df = pd.read_csv("/content/drive/MyDrive/7203 過去データ .csv")ヒストリカルデータから不要な文字を削除def number_converter(x):


 for s in [",", "M", "%"]:
   x = x.replace(s, "")

 return float(x)
for col in ["終値", "始値", "高値", "安値", "出来高", "前日比%"]: df[col] = df[col].apply(number_converter)日付と終値を抽出必要なデータは日付と終値なので、高値、安値、出来高、前日比変化率のデータを削除したうえで、日付が古い順に並び変えます。import datetime

df["日付け"] = pd.to_datetime(df["日付け"], format='%Y年%m月%d日')
df = df.set_index('日付け')

df = df.drop(['始値', '高値', '安値','出来高','前日比%'], axis=1)
df = df.sort_index(ascending=True)
df.head() 日付を基準にしてPN値と終値を結合table = df_tweets.join(df, how='right').dropna()
print(table.head())訓練データとテストデータを分割してCSV形式で出力＃学習データとテストデータに分割
X = table.values[:, 0]
y = table.values[:, 1]
(X_train, X_test, y_train, y_test) = train_test_split(X, y, test_size=0.2, random_state=0, shuffle=False)
X_train_std = (X_train - X_train.mean()) / X_train.std()
X_test_std = (X_test - X_train.mean()) / X_train.std()

＃indexを日付、カラム名をpn値、終値にしてcsv形式で出力
df_train = pd.DataFrame(
   {'pn': X_train_std,
    '終値': y_train},
   columns=['pn', '終値'],
   index=table.index[:len(X_train_std)])
df_train.to_csv('df_train.csv')

＃テストデータも同様にCSV形式で出力
df_test = pd.DataFrame(
   {'pn': X_test_std,
    '終値': y_test},
   columns=['pn', '終値'],
   index=table.index[len(X_train_std):])
df_test.to_csv('df_test.csv')訓練データ1日ごとのPN値と株価の変化量を抽出rates_fd = open('./df_train.csv', 'r')
rates_fd.readline()  

exchange_dates = []

pn_rates = []
pn_rates_diff = []

exchange_rates = []
exchange_rates_diff = []

prev_pn = df_train['pn'].mean()
prev_exch = df_train['終値'].mean()

for line in rates_fd:
   splited = line.split(",")
   #df_train.csvの１列目日付を格納
   time = splited[0]  
   #df_train.csvの２列目PN値
   pn_val = float(splited[1])   
   #df_train.csvの３列目株価の終値
   exch_val = float(splited[2])  
   #取得した日付を格納
   exchange_dates.append(time) 

   #PN値の変化を格納
   pn_rates.append(pn_val)
   pn_rates_diff.append(pn_val - prev_pn)   

   #株価の変化を格納
   exchange_rates.append(exch_val)
   exchange_rates_diff.append(exch_val - prev_exch)   

   prev_pn = pn_val
   prev_exch = exch_val
rates_fd.close()PN値、株価データそれぞれ前日まで直近3日間の変化量を訓練データとし、当日の株価の上下を正解ラベル(プラスなら1、マイナスなら0)としてデータを整形INPUT_LEN = 3
data_len = len(pn_rates_diff)
tr_input_mat = []
tr_angle_mat = []
prev_pred = 0
for i in range(INPUT_LEN, data_len):
   tmp_arr = []
   for j in range(INPUT_LEN):
       tmp_arr.append(exchange_rates_diff[i - INPUT_LEN + j])
       tmp_arr.append(pn_rates_diff[i - INPUT_LEN + j])   
   tr_input_mat.append(tmp_arr)  # i日目の直近3日間の株価とネガポジの変化

   if exchange_rates_diff[i] >= 0:  # i日目の株価の上下、プラスなら1、マイナスなら0
       tr_angle_mat.append(1)
   else:
       tr_angle_mat.append(0)   
train_feature_arr = np.array(tr_input_mat)
train_label_arr = np.array(tr_angle_mat)テストデータ1日ごとのPN値と株価の変化量を抽出rates_fd = open('./df_test.csv', 'r')
rates_fd.readline()  
exchange_dates = []

pn_rates = []
pn_rates_diff = []

exchange_rates = []
exchange_rates_diff = []

prev_pn = df_test['pn'][0]
prev_exch = df_test['終値'][0]

for line in rates_fd:
   splited = line.split(",")
   #df_test.csvの１列目日付
   time = splited[0]   
   #df_test.csvの２列目PN値
   pn_val = float(splited[1])   
   #df_test.csvの３列目株価の終値
   exch_val = float(splited[2])  
   #取得した日付を格納
   exchange_dates.append(time)  

   #PN値の変化を格納
   pn_rates.append(pn_val)
   pn_rates_diff.append(pn_val - prev_pn)  

    #株価の変化を格納
   exchange_rates.append(exch_val)
   exchange_rates_diff.append(exch_val - prev_exch)  

   prev_pn = pn_val
   prev_exch = exch_val
rates_fd.close()PN値、株価データそれぞれ前日まで直近3日間の変化量を訓練データとし、当日の株価の上下を正解ラベル(プラスなら1、マイナスなら0)としてデータを整形INPUT_LEN = 3
data_len = len(pn_rates_diff)
test_input_mat = []
test_angle_mat = []
prev_pred = 0
for i in range(INPUT_LEN, data_len):
   test_arr = []
   for j in range(INPUT_LEN):
       test_arr.append(exchange_rates_diff[i - INPUT_LEN + j])
       test_arr.append(pn_rates_diff[i - INPUT_LEN + j])   
   test_input_mat.append(test_arr)  # i日目の直近3日間の株価とネガポジの変化

   if exchange_rates_diff[i] >= 0:  # i日目の株価の上下、プラスなら1、マイナスなら0
       test_angle_mat.append(1)
   else:
       test_angle_mat.append(0)   
test_feature_arr = np.array(test_input_mat)
test_label_arr = np.array(test_angle_mat)予測モデル(ロジスティック回帰、ランダムフォレスト、SVM)を構築し予測精度を計測ロジスティック回帰・・一般化線形モデルの一つであり、目的変数が2値の時（二値判別問題）や確率を求めたい時によく使用される。　　　　　　　　　　　　　　ランダムフォレスト・・・ランダムフォレストとは、アンサンブル学習のバギングをベースに、少しずつ異なる決定木をたくさん集めたもの。決定木単体では過学習しやすいという欠点があり、ランダムフォレストはこの問題に対応する方法の1つ。SVM・・・サポートベクターマシン（英: support vector machine, SVM）は、教師あり学習を用いるパターン認識モデルの一つである。分類や回帰へ適用でき、現在知られている手法の中でも認識性能が優れた学習モデルの一つ。for model in [LogisticRegression(), RandomForestClassifier(n_estimators=200, max_depth=8, random_state=0), SVC()]:
   model.fit(train_feature_arr, train_label_arr)
   print("--Method:", model.__class__.__name__, "--")
   print("Cross validatin scores:{}".format(model.score(test_feature_arr, test_label_arr)))5 予測精度の検証　今回の結果はロジスティック回帰が0.54、ランダムフォレスト0.41、SVMが0.61となりました。最も数値が高かったSVMでも0.61で、適当に株価の上下を予測しても5割当たるとすれば、予測精度はあまり高くありません。ランダムフォレストに至っては0.41と5割を下回っています。要因として、まずは取得したトヨタ公式アカウントのツイートが必ずしも株価に影響を与える内容のものではないことが考えられます。次は公式アカウントからだけでなく、より広範囲のツイートを取得する必要がありそうです。また、辞書に登録されている単語数が十分ではないかもしれません。さらに言えば、トヨタは日経平均株価などの指数にも採用されている大型株なので、個人投資家の心理だけでなく外国人投資家の手口や信用取引、先物取引の需給など他のファクターも考慮した分析方法を検討していく必要がありそうで、今後学習を進める中で改善方法を探していきたいと思います。
