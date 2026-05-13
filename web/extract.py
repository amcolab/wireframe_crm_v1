from bs4 import BeautifulSoup
import os

with open('index.backup.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

def extract_section(section_id, filename):
    section = soup.find('section', id=section_id)
    if section:
        # Create directory if not exists
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(str(section))
        print(f"Extracted {section_id} to {filename}")
    else:
        print(f"Section {section_id} not found")

extract_section('contact', 'public/screens/contact/ct01_list.html')
extract_section('activity', 'public/screens/activity/at01_list.html')
extract_section('project', 'public/screens/project/pr01_list.html')
