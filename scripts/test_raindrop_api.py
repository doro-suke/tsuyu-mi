import os
import json
import requests
from dotenv import load_dotenv

def main():
    # .envファイルを読み込む
    load_dotenv()
    
    api_key = os.getenv("RAINDROP_API_KEY")
    if not api_key:
        print("エラー: RAINDROP_API_KEY が .env に設定されていません。")
        return

    # Raindrop.io API エンドポイント (0は「すべてのブックマーク」)
    url = "https://api.raindrop.io/rest/v1/raindrops/0"
    params = {
        "perpage": 3,
        "sort": "-created"  # 最新順
    }
    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    print(f"Raindrop.io API に接続中: {url}")
    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        # 取得したアイテムの数を確認
        count = len(data.get("items", []))
        print(f"成功: {count} 件のブックマークを取得しました。")

        # 結果を保存
        output_path = "data/sample_raindrops.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"結果を {output_path} に保存しました。")

    except requests.exceptions.RequestException as e:
        print(f"エラーが発生しました: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"詳細: {e.response.text}")

if __name__ == "__main__":
    main()
