#!/bin/bash

cd "${0%/*}"
. ../common.sh

echo "Processing Artifact..."

#ProcessDepot ".so"
ProcessVPK

while IFS= read -r -d '' file
do
	baseFile="${file%.*}.txt"
	
	echo "> VPK $baseFile"
	
	../.support/vpktool "$file" > "$baseFile"
done <   <(find "game/dcg/maps/" -type f -name "*.vpk" -print0)

FixUCS2

CreateCommit "$(grep "SourceRevision=" game/dcg/steam.inf | grep -o '[0-9\.]*')" "$1"
