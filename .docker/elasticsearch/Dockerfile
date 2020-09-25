FROM docker.elastic.co/elasticsearch/elasticsearch:7.5.1

ENV USER=elasticsearch
ENV UID=1000

RUN usermod -u ${UID} ${USER}

USER ${USER}

RUN chown -R ${USER}:${UID} /usr/share/elasticsearch/data